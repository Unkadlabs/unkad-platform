import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { makeT } from '@/lib/i18n';
import StepIndicator from '@/components/StepIndicator';
import { ProfileForm, ConsentForm } from '@/components/OnboardingForms';

export default async function OnboardingPage() {
  const user = await requireUser();
  const lang = await getLang();
  const t = makeT(lang);

  // Step 1 (account) is complete by definition — the user exists.
  const needsProfile = !user.dialect;
  const needsConsent = !user.consentAt;

  if (!needsProfile && !needsConsent) redirect('/contribute');

  const stepNames = [t('stepAccount'), t('stepProfile'), t('stepConsent')];
  const current = needsProfile ? 1 : 2;

  return (
    <div className="container">
      <h1>{t('onboardingTitle')}</h1>
      <StepIndicator steps={stepNames} current={current} />

      {needsProfile ? (
        <div className="card rise">
          <h3>{t('profileTitle')}</h3>
          <p className="muted">{t('profileWhy')}</p>
          <ProfileForm
            d={{
              dialectLabel: t('dialectLabel'),
              dialect_maxaa_tiri: t('dialectMaxaa'),
              dialect_maay: t('dialectMaay'),
              dialect_both: t('dialectBoth'),
              dialect_other: t('dialectOther'),
              regionLabel: t('regionLabel'),
              countryLabel: t('countryLabel'),
              continue: t('continue'),
              errRequired: t('errRequired'),
            }}
          />
        </div>
      ) : (
        <div className="card rise">
          <h3>{t('consentTitle')}</h3>
          <p>{t('consentBody1')}</p>
          <p className="muted">{t('consentBody2')}</p>
          <ConsentForm
            d={{
              creditLabel: t('creditLabel'),
              credit_handle: t('creditHandle'),
              credit_real_name: t('creditRealName'),
              credit_anonymous: t('creditAnonymous'),
              creditNameLabel: t('creditNameLabel'),
              agreeLabel: t('agreeLabel'),
              finish: t('finish'),
              errRequired: t('errRequired'),
              errConsentRequired: t('errConsentRequired'),
            }}
          />
        </div>
      )}
    </div>
  );
}
