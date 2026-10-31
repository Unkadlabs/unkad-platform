// Partner organisation review of the released corpus, reached by an
// unguessable link and nothing else. Built for UBAHS, the association of
// Somali mother-tongue teachers in Sweden: type a name once, pick a category,
// then mark released sentences one at a time.
//
// Somali only, because the people using it are Somali teachers. All copy here
// and in the two components is !! VERIFY SOMALI !!

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg, getReviewerName, nextSentence, reviewerCount, sectorProgress } from '@/lib/org-review';
import { sectorLabel } from '@/lib/i18n';
import OrgNameGate from '@/components/OrgNameGate';
import OrgReviewer from '@/components/OrgReviewer';

export const metadata: Metadata = {
  title: 'Hubinta jumladaha · Qor',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

export default async function OrgReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { token } = await params;
  const { s } = await searchParams;
  const org = await getOrg(token);
  if (!org) notFound();

  const name = await getReviewerName();
  if (!name) {
    return (
      <div className="seed-page">
        <OrgNameGate token={token} orgName={org.name} shortName={org.shortName} />
      </div>
    );
  }

  const [progress, mine] = await Promise.all([sectorProgress(org.id), reviewerCount(org.id)]);
  const total = progress.reduce((a, p) => a + p.total, 0);
  const done = progress.reduce((a, p) => a + p.done, 0);
  const current = s ? progress.find((p) => p.sector === s) : undefined;

  return (
    <div className="seed-page">
      <div className="seed-top">
        <span className="seed-who">{name}</span>
        <span className="seed-count">
          Adiga: <b>{mine}</b> · {org.shortName}: <b>{done}</b> / {total}
        </span>
      </div>

      {current ? (
        <OrgReviewer
          key={current.sector}
          token={token}
          sector={current.sector}
          sectorName={sectorLabel('so', current.sector)}
          shortName={org.shortName}
          initial={await nextSentence(token, current.sector)}
        />
      ) : (
        <div className="seed-wrap">
          <h1 className="seed-h1" style={{ marginTop: '1.4rem' }}>Dooro qayb</h1>
          <p className="seed-lede">
            Jumladahan waxay ku jiraan xogta aan ku daabacnay Hugging Face. Mid kasta oo aad
            hubiso waxay heleysaa calaamadda «waxaa hubiyay {org.shortName}».
          </p>
          <div className="seed-sectors org-sectors">
            {progress.map((p) => {
              const pct = p.total ? Math.round((100 * p.done) / p.total) : 100;
              return (
                <Link
                  key={p.sector}
                  href={`/barayaasha/${token}?s=${p.sector}`}
                  className={`seed-sector${p.done >= p.total ? ' done' : ''}`}
                >
                  <span className="nm">{sectorLabel('so', p.sector)}</span>
                  <span className="fr">{p.done} / {p.total}</span>
                  <span className="tr"><i style={{ width: `${pct}%` }} /></span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
