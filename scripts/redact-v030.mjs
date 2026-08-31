// One-off redaction pass before the v0.3.0 release, run 2026-08-31.
//
// A pre-publication scan of the export turned up two records that should not
// go out under CC-BY-SA-4.0. Both are handled here in a single transaction so
// the corpus is never left half-corrected, and both leave an audit row.
//
//   1. A republished third-party article. Journalism, not the contributor's
//      own writing, so we have no right to relicense it. Rejected outright:
//      the same end state a reviewer overturn produces.
//
//   2. A legal glossary ending `Waxaa qoray <name>`. The signature sits in the
//      training text rather than the credits file, so a model trained on it
//      learns to emit a real person's name. The line is removed and the rest
//      is kept.
//
// On keeping verification for (2): reviseSubmission deliberately sends an
// edited item back to pending, because votes were cast on different words and
// a release must not ship text no linguist has read. A redaction is the one
// edit where that does not apply — it only removes text, and every remaining
// word was already read and signed off. The revision row preserves the
// original either way, so the decision is reversible.
//
//   node scripts/redact-v030.mjs --dry
//   node scripts/redact-v030.mjs --commit

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const f = process.env.THANKS_ENV || path.join(process.cwd(), '.env.local');
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
const ARTICLE = '3ac85f2e-5602-49e8-9b47-879bf8682ff0';
const GLOSSARY = '4456b083-1a8f-44e5-90aa-027d52285d77';
const SIGNATURE = /\n*[ \t]*Waxaa qoray[^\n]*[ \t]*$/i;

const client = await pool.connect();
try {
  await client.query('begin');

  const [admin] = (await client.query("select id from users where handle = 'khalid'")).rows;
  if (!admin) throw new Error('no admin user found');

  // ---- 1. the article ------------------------------------------------------
  const [art] = (await client.query(
    'select status::text st, left(text_so, 70) head from submissions where id = $1', [ARTICLE]
  )).rows;
  if (!art) throw new Error('article record not found');
  console.log(`article  ${art.st} → rejected   ${JSON.stringify(art.head.replace(/\n/g, ' '))}`);

  await client.query(
    "update submissions set status = 'rejected', updated_at = now() where id = $1", [ARTICLE]
  );
  await client.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, meta)
     values ($1, 'review.overturned', 'submission', $2, $3)`,
    [admin.id, ARTICLE, JSON.stringify({
      reason: 'republished third-party article; no right to relicense under CC-BY-SA-4.0',
      before: 'v0.3.0 release',
    })]
  );

  // ---- 2. the signature ----------------------------------------------------
  const [glos] = (await client.query(
    'select text_so, text_en, meaning_en from submissions where id = $1', [GLOSSARY]
  )).rows;
  if (!glos) throw new Error('glossary record not found');

  const after = glos.text_so.replace(SIGNATURE, '').trimEnd();
  if (after === glos.text_so) throw new Error('signature line did not match; nothing would change');
  console.log(`glossary removed ${glos.text_so.length - after.length} chars: `
    + JSON.stringify(glos.text_so.slice(after.length).trim()));

  await client.query(
    `insert into submission_revisions (submission_id, text_so, text_en, meaning_en, edited_by, note)
     values ($1, $2, $3, $4, $5, $6)`,
    [GLOSSARY, glos.text_so, glos.text_en, glos.meaning_en, admin.id,
     'removed the author signature line: a personal name sitting inside training text']
  );
  await client.query(
    'update submissions set text_so = $1, char_count = $2, updated_at = now() where id = $3',
    [after, after.length, GLOSSARY]
  );
  await client.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, meta)
     values ($1, 'submission.revised', 'submission', $2, $3)`,
    [admin.id, GLOSSARY, JSON.stringify({
      reason: 'stripped author signature: a personal name inside training text',
      verificationKept: 'a redaction only removes already-verified text',
      before: 'v0.3.0 release',
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
