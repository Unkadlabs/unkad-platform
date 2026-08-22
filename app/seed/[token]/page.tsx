// Seed set writing page, reached by an unguessable token and nothing else.
//
// Deliberately outside the account system: this is for a small number of
// invited people writing instruction pairs by hand, and asking a volunteer to
// register before they can start is how volunteers stop starting.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getInvite, getItems } from '@/lib/seed';
import { getLang } from '@/lib/lang';
import { makeT, sectorLabel } from '@/lib/i18n';
import LangToggle from '@/components/LangToggle';
import SeedConsent from '@/components/SeedConsent';
import SeedWriter from '@/components/SeedWriter';

// Never indexed, never followed, never cached. The token is the credential
// and it lives in the path.
export const metadata: Metadata = {
  title: 'Qor Af-Soomaali',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

export default async function SeedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInvite(token);
  if (!invite) notFound();

  const lang = await getLang();
  const t = makeT(lang);

  const frame = (inner: React.ReactNode) => (
    <div className="seed-page">
      <div className="seed-lang"><LangToggle lang={lang} /></div>
      {inner}
    </div>
  );

  if (!invite.consentAt) {
    return frame(
      <SeedConsent
        token={token}
        labels={{
          welcome: t('seedWelcome'), intro: t('seedConsentIntro'),
          title: t('seedConsentTitle'),
          p1: t('seedConsentP1'), p2: t('seedConsentP2'), p3: t('seedConsentP3'),
          p4: t('seedConsentP4'), p5: t('seedConsentP5'),
          credit: t('seedCreditLabel'), agree: t('seedAgree'), cta: t('seedAgreeCta'),
        }}
      />
    );
  }

  const sectors = invite.sectors.split(',').map((s) => s.trim());
  const items = await getItems(invite.id);

  return frame(
    <SeedWriter
      token={token}
      name={invite.creditName ?? ''}
      sectors={sectors}
      perSector={invite.perSector}
      sectorNames={Object.fromEntries(sectors.map((s) => [s, sectorLabel(lang, s)]))}
      initial={items.map((i) => ({
        id: i.id, ref: i.ref, type: i.type, sector: i.sector,
        instruction: i.instruction, response: i.response, note: i.note,
      }))}
      labels={{
        thanks: t('seedThanks'), howTitle: t('seedHowTitle'), how: t('seedHow'),
        question: t('seedQuestion'), questionHint: t('seedQuestionHint'),
        answer: t('seedAnswer'), answerHint: t('seedAnswerHint'),
        note: t('seedNote'), save: t('seedSave'), saving: t('seedSaving'),
        update: t('seedUpdate'), cancelEdit: t('seedCancelEdit'), editing: t('seedEditing'),
        full: t('seedFull'), done: t('seedDone'),
        subjects: t('seedSubjects'), subjectsHint: t('seedSubjectsHint'),
        written: t('seedWritten'), nothingYet: t('seedNothingYet'),
        edit: t('seedEdit'), delete: t('seedDelete'), confirmDelete: t('seedConfirmDelete'),
        itIsAWord: t('seedItIsAWord'), chars: t('seedChars'),
        hintUnknown: t('seedHintUnknown'), hintYours: t('seedHintYours'),
        hintLower: t('seedHintLower'), hintDup: t('seedHintDup'),
      }}
    />
  );
}
