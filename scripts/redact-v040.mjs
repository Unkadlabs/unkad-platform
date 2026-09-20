// One-off redaction pass before the v0.4.0 release, run 2026-09-20.
//
// The pre-publication scan of the export (98 new documents) turned up one
// record that cannot go out under CC-BY-SA-4.0, and one already-published
// record carrying a personal name inside the training text. Same shape as
// redact-v030.mjs: one transaction, an audit row for each change, a revision
// row preserving the original wherever text is edited.
//
//   1. A 3,168-word summary of Mandela's autobiography. The text itself says
//      Facebook resurfaced it as a memory and credits a different author
//      ("W.: Maxamed Haaruun") from the contributor who submitted it. A
//      reposted third-party text is not the contributor's own writing, so we
//      have no right to relicense it. Rejected outright, the end state a
//      reviewer overturn produces. (The review page cannot overturn an item
//      that is already linguist-verified, which is why this is a script.)
//
//   2. A short poem in v0.3.1 opening `Qoraa: <name>`. Same treatment as the
//      v0.3.0 glossary: the signature line is removed, the rest is kept, and
//      verification stands because a redaction only removes text that was
//      already read and signed off.
//
//   node scripts/redact-v040.mjs --dry
//   node scripts/redact-v040.mjs --commit

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const f = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(
    fs.readFileSync(f, 'utf8').split('\n')
      .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
  );
}

const env = { ...loadEnv(), ...process.env };
const cs = env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;
const local = /localhost|127\.0\.0\.1/.test(cs ?? '');
const pool = new Pool({ connectionString: cs, ssl: local ? undefined : { rejectUnauthorized: false } });

const COMMIT = process.argv.includes('--commit');
const REPOST = 'f99101d1-7b9f-43cf-8c5e-b3d5c4bf48e1';
const POEM = '6d381511-2e1b-451a-bdc5-e56748965a47';
// The signature is the second line of the poem, after its title.
// Stored with CRLF line endings, as phone keyboards send them.
const SIGNATURE = /^([^\r\n]*(?:\r?\n)+)[ \t]*Qoraa:[^\r\n]*(?:\r?\n)+/i;

const client = await pool.connect();
try {
  await client.query('begin');

  const [admin] = (await client.query("select id from users where handle = 'khalid'")).rows;
  if (!admin) throw new Error('no admin user found');

  // ---- 1. the repost -------------------------------------------------------
  const [rep] = (await client.query(
    'select status::text st, left(text_so, 70) head from submissions where id = $1', [REPOST]
  )).rows;
  if (!rep) throw new Error('repost record not found');
  if (!rep.head.startsWith('Lix sanno hortood')) throw new Error('repost record does not look right: ' + rep.head);
  console.log(`repost   ${rep.st} → rejected   ${JSON.stringify(rep.head.replace(/\n/g, ' '))}`);

  await client.query(
    "update submissions set status = 'rejected', updated_at = now() where id = $1", [REPOST]
  );
  await client.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, meta)
     values ($1, 'review.overturned', 'submission', $2, $3)`,
    [admin.id, REPOST, JSON.stringify({
      reason: 'reposted third-party text (Facebook memory crediting a different author); no right to relicense under CC-BY-SA-4.0',
      before: 'v0.4.0 release',
    })]
  );

  // ---- 2. the signature ----------------------------------------------------
  const [poem] = (await client.query(
    'select text_so, text_en, meaning_en from submissions where id = $1', [POEM]
  )).rows;
  if (!poem) throw new Error('poem record not found');

  const after = poem.text_so.replace(SIGNATURE, '$1').trimEnd();
  if (after === poem.text_so) throw new Error('signature line did not match; nothing would change');
  const removed = poem.text_so.length - after.length;
  console.log(`poem     removed ${removed} chars: ${JSON.stringify(poem.text_so.match(SIGNATURE)[0].split('\n').filter(l => /Qoraa/i.test(l))[0].trim())}`);
  console.log(`poem     now begins: ${JSON.stringify(after.slice(0, 80).replace(/\n/g, ' | '))}`);

  await client.query(
    `insert into submission_revisions (submission_id, text_so, text_en, meaning_en, edited_by, note)
     values ($1, $2, $3, $4, $5, $6)`,
    [POEM, poem.text_so, poem.text_en, poem.meaning_en, admin.id,
     'removed the author signature line: a personal name sitting inside training text']
  );
  await client.query(
    'update submissions set text_so = $1, char_count = $2, updated_at = now() where id = $3',
    [after, after.length, POEM]
  );
  await client.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, meta)
     values ($1, 'submission.revised', 'submission', $2, $3)`,
    [admin.id, POEM, JSON.stringify({
      reason: 'stripped author signature: a personal name inside training text',
      verificationKept: 'a redaction only removes already-verified text',
      before: 'v0.4.0 release',
    })]
  );

  if (COMMIT) {
    await client.query('commit');
    console.log('\ncommitted.');
  } else {
    await client.query('rollback');
    console.log('\ndry run — rolled back. re-run with --commit to apply.');
  }
} catch (e) {
  await client.query('rollback');
  console.error('rolled back:', e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
