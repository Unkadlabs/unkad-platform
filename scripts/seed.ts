// Dev/pilot seed: an admin account and a starter batch of prompts.
//
// !! VERIFY SOMALI !! — all Somali prompt text below is draft and must be
// reviewed by trusted reviewers before the pilot.
//
// Run: npm run db:seed

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../lib/db';
import { users, prompts } from '../lib/schema';

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@unkad.com';

// Never hardcode this. A literal here ends up in the repo, and this repo is
// public, which put a working production admin password on the internet once
// already. Taken from the environment, or generated per run and printed once.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? randomBytes(18).toString('base64url');

// This seed creates an admin. Running it against a shared database would plant
// an account whose provenance nobody remembers. Local only, and it refuses
// rather than warns.
function assertLocalDatabase(): void {
  const cs = process.env.DATABASE_URL ?? '';
  const host = cs.match(/@([^/:]+)/)?.[1] ?? 'localhost';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
  if (!isLocal && process.env.SEED_ALLOW_REMOTE !== 'yes') {
    console.error(
      `\nRefusing to seed a non-local database (${host}).\n` +
        'This creates an admin account. If you genuinely mean to, re-run with ' +
        'SEED_ALLOW_REMOTE=yes and set SEED_ADMIN_PASSWORD yourself.\n'
    );
    process.exit(1);
  }
}

const WRITE_PROMPTS: Array<{
  register: 'conversational' | 'narrative' | 'instructional' | 'formal' | 'technical';
  topic: string;
  so: string;
  en: string;
}> = [
  {
    register: 'narrative',
    topic: 'daily-life',
    so: 'Ku sharax maalin suuq ah oo magaaladaada ka dhacday.',
    en: 'Describe a market day in your town.',
  },
  {
    register: 'instructional',
    topic: 'food',
    so: 'Sharax sida loo sameeyo canjeero.',
    en: 'Explain how to prepare canjeero.',
  },
  {
    register: 'conversational',
    topic: 'commerce',
    so: 'Qor wada-hadal gaaban oo u dhexeeya dukaanle iyo macmiil.',
    en: 'Write a short dialogue between a shopkeeper and a customer.',
  },
  {
    register: 'narrative',
    topic: 'family',
    so: 'Ka sheekee xus ama dabbaaldeg qoys oo aad xasuusato.',
    en: 'Tell the story of a family celebration you remember.',
  },
  {
    register: 'instructional',
    topic: 'agriculture',
    so: 'Sharax sida loo beero oo loo daryeelo beer yar.',
    en: 'Explain how to plant and care for a small garden.',
  },
  {
    register: 'formal',
    topic: 'education',
    so: 'Qor qoraal kooban oo ku saabsan muhiimadda waxbarashada.',
    en: 'Write a short piece on the importance of education.',
  },
  {
    register: 'conversational',
    topic: 'weather',
    so: 'Qor wada-hadal ku saabsan cimilada maanta iyo saadaasha berri.',
    en: 'Write a dialogue about today’s weather and tomorrow’s forecast.',
  },
  {
    register: 'technical',
    topic: 'health',
    so: 'Sharax sida gacmaha loo dhaqo si caafimaad leh.',
    en: 'Explain how to wash your hands properly for good health.',
  },
  {
    register: 'narrative',
    topic: 'travel',
    so: 'Ka sheekee safar aad mar qaadday.',
    en: 'Tell the story of a journey you once took.',
  },
  {
    register: 'formal',
    topic: 'media',
    so: 'Qor war kooban oo ku saabsan dhacdo bulshada ku saameysay.',
    en: 'Write a short news item about an event that affected your community.',
  },
];

const TRANSLATE_SOURCES: Array<{
  register: 'conversational' | 'formal' | 'instructional';
  topic: string;
  en: string;
}> = [
  { register: 'conversational', topic: 'daily-life', en: 'Where is the nearest market?' },
  { register: 'conversational', topic: 'daily-life', en: 'How much does this cost?' },
  {
    register: 'instructional',
    topic: 'health',
    en: 'Drink clean water and wash your hands before eating.',
  },
  {
    register: 'instructional',
    topic: 'health',
    en: 'Take this medicine twice a day after meals.',
  },
  { register: 'formal', topic: 'education', en: 'The school year begins in September.' },
  { register: 'conversational', topic: 'family', en: 'My grandmother tells the best stories.' },
  { register: 'formal', topic: 'law', en: 'Every citizen has the right to education.' },
  { register: 'instructional', topic: 'agriculture', en: 'Plant the seeds after the first rain.' },
  { register: 'conversational', topic: 'commerce', en: 'Can you give me a better price?' },
  { register: 'formal', topic: 'media', en: 'The meeting was postponed until next week.' },
];

async function main() {
  assertLocalDatabase();

  const existing = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(users).values({
      email: ADMIN_EMAIL,
      handle: 'Unkad Admin',
      passwordHash,
      role: 'admin',
      dialect: 'both',
      consentAt: new Date(),
      creditChoice: 'handle',
      onboardingCompletedAt: new Date(),
    });
    console.log(`Created admin: ${ADMIN_EMAIL}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`Generated password (shown once, not stored anywhere): ${ADMIN_PASSWORD}`);
    }
  } else {
    console.log('Admin already exists, skipping.');
  }

  const existingPrompts = await db.select({ id: prompts.id }).from(prompts).limit(1);
  if (existingPrompts.length > 0) {
    console.log('Prompts already exist, skipping seed.');
    return;
  }

  const topicToSector: Record<string, 'health' | 'education' | 'agriculture' | 'law' | 'media' | 'culture' | 'general'> = {
    health: 'health',
    education: 'education',
    agriculture: 'agriculture',
    law: 'law',
    media: 'media',
    family: 'culture',
    travel: 'culture',
    'daily-life': 'culture',
    food: 'culture',
  };

  await db.insert(prompts).values(
    WRITE_PROMPTS.map((p) => ({
      mode: 'write' as const,
      register: p.register,
      sector: topicToSector[p.topic] ?? ('general' as const),
      topic: p.topic,
      textSo: p.so,
      textEn: p.en,
    }))
  );

  await db.insert(prompts).values(
    TRANSLATE_SOURCES.map((p) => ({
      mode: 'translate' as const,
      register: p.register,
      sector: topicToSector[p.topic] ?? ('general' as const),
      topic: p.topic,
      textSo: 'U turjun jumladan af-Soomaali.',
      textEn: 'Translate this sentence into Somali.',
      sourceText: p.en,
    }))
  );

  console.log(
    `Seeded ${WRITE_PROMPTS.length} write prompts and ${TRANSLATE_SOURCES.length} translate prompts.`
  );
}

main().then(() => process.exit(0));
