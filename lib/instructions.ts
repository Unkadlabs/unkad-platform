// The 1,000-pair instruction dataset: where it stands and where the holes are.
//
// An instruction pair is not a separate thing we collect. It is what a prompt
// and its accepted answer already are: prompt text becomes the instruction,
// the contributor's Somali becomes the response. So "how many pairs do we
// have" is a question about accepted, prompt-linked submissions, and "how do
// we get more" is a question about which prompts exist and which get answered.
//
// The read model exists because the answer was not visible anywhere: the
// prompt bank had grown to 444 translate prompts against 10 write prompts,
// while write prompts were producing roughly 24x more pairs each. Nobody could
// see that, so nobody could act on it.

import { and, count, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from './db';
import { prompts, submissions } from './schema';

export const PAIR_GOAL = 1000;

export const SECTORS = [
  'health', 'education', 'agriculture', 'law', 'media',
  'religion', 'culture', 'technology', 'general',
] as const;

export type Sector = (typeof SECTORS)[number];

export type SectorRow = {
  sector: string;
  pairs: number;
  writePrompts: number;
  translatePrompts: number;
  unanswered: number;
};

export type InstructionState = {
  total: number;
  goal: number;
  remaining: number;
  pct: number;
  byMode: { mode: string; pairs: number }[];
  bySector: SectorRow[];
  writeYield: number | null;
  translateYield: number | null;
  unansweredTotal: number;
};

export async function instructionState(): Promise<InstructionState> {
  // A pair = an accepted submission that came from a prompt. Free writes with
  // only a topic are harvestable too, but they need a templated instruction,
  // so they are deliberately not counted here as the firm number.
  const pairRows = await db
    .select({ mode: submissions.mode, sector: submissions.sector, n: count() })
    .from(submissions)
    .where(and(eq(submissions.status, 'accepted'), isNotNull(submissions.promptId)))
    .groupBy(submissions.mode, submissions.sector);

  const promptRows = await db
    .select({ mode: prompts.mode, sector: prompts.sector, n: count() })
    .from(prompts)
    .where(eq(prompts.active, true))
    .groupBy(prompts.mode, prompts.sector);

  // Prompts nobody has answered yet: live supply that is already paid for.
  const unansweredRows = await db
    .select({ sector: prompts.sector, n: count() })
    .from(prompts)
    .where(
      and(
        eq(prompts.active, true),
        sql`not exists (select 1 from submissions s where s.prompt_id = ${prompts.id})`
      )
    )
    .groupBy(prompts.sector);

  const total = pairRows.reduce((s, r) => s + Number(r.n), 0);

  const modeMap = new Map<string, number>();
  for (const r of pairRows) modeMap.set(r.mode, (modeMap.get(r.mode) ?? 0) + Number(r.n));

  const bySector: SectorRow[] = SECTORS.map((sector) => {
    const pairs = pairRows.filter((r) => r.sector === sector).reduce((s, r) => s + Number(r.n), 0);
    const writePrompts = promptRows
      .filter((r) => r.sector === sector && r.mode === 'write')
      .reduce((s, r) => s + Number(r.n), 0);
    const translatePrompts = promptRows
      .filter((r) => r.sector === sector && r.mode === 'translate')
      .reduce((s, r) => s + Number(r.n), 0);
    const unanswered = unansweredRows
      .filter((r) => r.sector === sector)
      .reduce((s, r) => s + Number(r.n), 0);
    return { sector, pairs, writePrompts, translatePrompts, unanswered };
  }).sort((a, b) => a.pairs - b.pairs);

  // Pairs produced per prompt, by mode. This is the number that says where to
  // spend an hour of prompt writing.
  const writePairs = modeMap.get('write') ?? 0;
  const translatePairs = modeMap.get('translate') ?? 0;
  const writePromptTotal = promptRows
    .filter((r) => r.mode === 'write')
    .reduce((s, r) => s + Number(r.n), 0);
  const translatePromptTotal = promptRows
    .filter((r) => r.mode === 'translate')
    .reduce((s, r) => s + Number(r.n), 0);

  return {
    total,
    goal: PAIR_GOAL,
    remaining: Math.max(0, PAIR_GOAL - total),
    pct: (total / PAIR_GOAL) * 100,
    byMode: [...modeMap.entries()].map(([mode, pairs]) => ({ mode, pairs })).sort((a, b) => b.pairs - a.pairs),
    bySector,
    writeYield: writePromptTotal ? writePairs / writePromptTotal : null,
    translateYield: translatePromptTotal ? translatePairs / translatePromptTotal : null,
    unansweredTotal: unansweredRows.reduce((s, r) => s + Number(r.n), 0),
  };
}
