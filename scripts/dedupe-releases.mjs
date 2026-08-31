// Removes duplicate rows for the same release version, keeping the newest.
//
// Republishing a corrected dataset card used to insert a second row for the
// same version instead of updating the first, which inflates the release count
// the status line reports. export.ts now updates in place; this clears what the
// old behaviour already left behind.
//
// Items are stamped with release_id, so any stamps pointing at a row being
// removed are moved to the surviving row first — a submission must never end up
// pointing at a release that no longer exists.
//
//   node --env-file-if-exists=.env.local scripts/dedupe-releases.mjs
//   node --env-file-if-exists=.env.local scripts/dedupe-releases.mjs --commit

import { Pool } from 'pg';

const live = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING;
if (!live) {
  console.error('No DATABASE_URL_UNPOOLED found. Run through the env file.');
  process.exit(1);
}
const pool = new Pool({ connectionString: live, ssl: { rejectUnauthorized: false } });
const COMMIT = process.argv.includes('--commit');

const client = await pool.connect();
try {
  await client.query('begin');

  const { rows: dupes } = await client.query(`
    select version, count(*)::int n from releases group by version having count(*) > 1
  `);

  if (!dupes.length) {
    console.log('No duplicate release versions.');
  }

  for (const d of dupes) {
    const { rows } = await client.query(
      'select id, item_count, created_at from releases where version = $1 order by created_at desc',
      [d.version]
    );
    const [keep, ...drop] = rows;
    console.log(`${d.version}: ${d.n} rows — keeping ${keep.id.slice(0, 8)} (${String(keep.created_at).slice(4, 21)})`);

    for (const r of drop) {
      const { rowCount } = await client.query(
        'update submissions set release_id = $1 where release_id = $2', [keep.id, r.id]
      );
      console.log(`  dropping ${r.id.slice(0, 8)} · moved ${rowCount} stamped submissions`);
      await client.query('delete from releases where id = $1', [r.id]);
    }
  }

  const { rows: after } = await client.query('select count(*)::int n from releases');
  console.log(`\nreleases now: ${after[0].n}`);

  if (COMMIT) {
    await client.query('commit');
    console.log('committed.');
  } else {
    await client.query('rollback');
    console.log('dry run — rolled back. re-run with --commit to apply.');
  }
} catch (e) {
  await client.query('rollback');
  console.error('rolled back:', e.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
