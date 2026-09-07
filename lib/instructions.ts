// The 1,000-pair instruction dataset: where it stands, and where the holes are.
//
// The dataset is written by hand by invited authors through /seed/[token], in
// Llama/Alpaca shape: an instruction, an optional input the instruction acts
// on, and the response. The founder's design writes each item in English
// first, where task coverage is easier to plan and judge, then builds the
// Somali version from it.
//
// This read model exists because none of that was visible anywhere. Four
// invites were out, two people had never consented, one person had written
// three items, and the only way to know was to run a script. Work that nobody
// can see is work that quietly stops.

import { desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { seedInvites, seedItems } from './schema';

export const PAIR_GOAL = 1000;

// The corpus sectors, so the seed set joins cleanly to everything else.
export const SECTORS = [
  'health', 'education', 'agriculture', 'law', 'media',
  'religion', 'culture', 'technology', 'general',
] as const;

// What a usable instruction set has to cover. Without this spread a finetune
// learns one trick: the harvested Qor pairs were almost entirely "translate
// this" and "write about this", which teaches translation and free writing
// and nothing else.
export const TASK_TYPES = [
  { key: 'task', label: 'Task', hint: 'question answering, explanation, how-to' },
  { key: 'refusal', label: 'Refusal', hint: 'a harmful request and a proper Somali refusal' },
  { key: 'control', label: 'Control', hint: 'a benign lookalike that must NOT be refused' },
] as const;

export type AuthorRow = {
  id: string;
  name: string | null;
  creditName: string | null;
  sectors: string;
  perSector: number;
  quota: number;
  consented: boolean;
  active: boolean;
  written: number;
  lastSeen: Date | null;
};

export type InstructionState = {
  total: number;
  goal: number;
  remaining: number;
  pct: number;
  approved: number;
  needsReview: number;
  needsSomali: number;
  draftEn: number;
  withEnglishBase: number;
  withInput: number;
  byType: { type: string; n: number }[];
  bySector: { sector: string; n: number }[];
  missingSectors: string[];
  authors: AuthorRow[];
  quotaTotal: number;
};

export async function instructionState(): Promise<InstructionState> {
  const [items, invites] = await Promise.all([
    db
      .select({
        id: seedItems.id,
        type: seedItems.type,
        sector: seedItems.sector,
        status: seedItems.status,
        inviteId: seedItems.inviteId,
        hasEn: sql<boolean>`(${seedItems.instructionEn} is not null and ${seedItems.instructionEn} <> '')`,
        hasInput: sql<boolean>`(${seedItems.input} is not null and ${seedItems.input} <> '')`,
      })
      .from(seedItems),
    db.select().from(seedInvites).orderBy(desc(seedInvites.createdAt)),
  ]);

  const total = items.length;
  const count = (f: (i: (typeof items)[number]) => boolean) => items.filter(f).length;

  const tally = <T extends string>(pick: (i: (typeof items)[number]) => T) => {
    const m = new Map<T, number>();
    for (const i of items) m.set(pick(i), (m.get(pick(i)) ?? 0) + 1);
    return m;
  };

  const sectorMap = tally((i) => i.sector);
  const typeMap = tally((i) => i.type);

  const authors: AuthorRow[] = invites.map((v) => {
    const sectorCount = v.sectors.split(',').filter((s) => s.trim()).length;
    return {
      id: v.id,
      name: v.name,
      creditName: v.creditName,
      sectors: v.sectors,
      perSector: v.perSector,
      quota: sectorCount * v.perSector,
      consented: Boolean(v.consentAt),
      active: v.active,
      written: items.filter((i) => i.inviteId === v.id).length,
      lastSeen: v.lastSeenAt,
    };
  });

  return {
    total,
    goal: PAIR_GOAL,
    remaining: Math.max(0, PAIR_GOAL - total),
    pct: (total / PAIR_GOAL) * 100,
    approved: count((i) => i.status === 'approved'),
    needsReview: count((i) => i.status === 'needs_review'),
    needsSomali: count((i) => i.status === 'needs_somali'),
    draftEn: count((i) => i.status === 'draft_en'),
    withEnglishBase: count((i) => i.hasEn),
    withInput: count((i) => i.hasInput),
    byType: [...typeMap.entries()].map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n),
    bySector: [...sectorMap.entries()].map(([sector, n]) => ({ sector, n })).sort((a, b) => b.n - a.n),
    missingSectors: SECTORS.filter((s) => !sectorMap.has(s)),
    authors,
    quotaTotal: authors.filter((a) => a.active).reduce((s, a) => s + a.quota, 0),
  };
}
