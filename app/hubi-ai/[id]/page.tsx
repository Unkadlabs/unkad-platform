// Result page for one Hubi AI run: the score, how everyone else is doing,
// each answer with the verdict, and a share line. The id is an unguessable
// uuid and the row holds nothing personal, so the page is public.

import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { hubiAiRuns } from '@/lib/schema';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import { HUBI_ITEMS, type HubiAnswer } from '@/lib/hubi-ai';

export const metadata: Metadata = {
  title: 'Natiijada Hubi AI-ga — Unkad',
  description: 'How well can you tell when AI gets Somali wrong?',
};

type Props = { params: Promise<{ id: string }> };

export default async function HubiAiResultPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const lang = await getLang();
  const t = makeT(lang);

  const [run] = await db.select().from(hubiAiRuns).where(eq(hubiAiRuns.id, id));
  if (!run) notFound();

  const [agg] = await db
    .select({ n: sql<number>`count(*)::int`, avg: sql<number>`coalesce(avg(${hubiAiRuns.score}), 0)::float` })
    .from(hubiAiRuns);

  const answers = run.answers as HubiAnswer[];
  const byId = new Map(answers.map((a) => [a.id, a]));
  const shareText = t('hubiShareText')
    .replace('{score}', String(run.score))
    .replace('{total}', String(run.total));
  const shareUrl = 'https://qor.unkad.com/hubi-ai';
  const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const x = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="container" style={{ maxWidth: '34rem' }}>
      <p className="mono" style={{ fontSize: '0.8rem' }}>
        <Link href="/">&larr; Unkad</Link>
      </p>

      {/* VERIFY SOMALI: strings in lib/i18n.ts */}
      <div className="card">
        <h3>{t('hubiResultTitle')}</h3>
        <p style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' }}>
          {run.score} / {run.total}
        </p>
        <p className="muted">
          {t('hubiAvgLine')
            .replace('{avg}', agg.avg.toFixed(1))
            .replace('{total}', String(run.total))
            .replace('{n}', String(agg.n))}
        </p>
        <div className="btn-row">
          <a className="btn" href={wa} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a className="btn" href={x} target="_blank" rel="noopener noreferrer">
            X
          </a>
          <Link className="btn" href="/hubi-ai">
            {t('hubiAgain')}
          </Link>
        </div>
      </div>

      {HUBI_ITEMS.map((it) => {
        const a = byId.get(it.id);
        return (
          <div className="card" key={it.id}>
            <p className="muted" lang="so" style={{ marginBottom: '0.25rem' }}>
              {it.question}
            </p>
            <p lang="so">&ldquo;{it.answer}&rdquo;</p>
            <p style={{ fontWeight: 700 }}>
              {a?.correct ? t('hubiCorrect') : t('hubiWrong')}{' '}
              <span className="muted" style={{ fontWeight: 400 }} lang="so">
                {it.why[lang]}
              </span>
            </p>
          </div>
        );
      })}

      <p className="hint" style={{ marginTop: '1rem' }}>
        {t('hubiCta')} <Link href="/join">{t('hubiCtaBtn')}</Link>
      </p>
    </div>
  );
}
