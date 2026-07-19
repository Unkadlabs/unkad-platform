// Somali-first UI strings with an English toggle.
//
// !! VERIFY SOMALI !!
// Every Somali string below must be reviewed by the founders / trusted
// reviewers before public launch. The four mode names (Qor, Turjun,
// Guuri, Hubi) come from the platform concept note; the rest are drafts.

export type Lang = 'so' | 'en';

export const LANG_COOKIE = 'unkad_lang';

const dict = {
  // Brand / nav
  appName: { so: 'Unkad', en: 'Unkad' },
  tagline: {
    so: 'Aynu af-Soomaaliga u qorno da’da AI-ga.',
    en: 'Let’s write Somali into the age of AI.',
  },
  navContribute: { so: 'Wax ku dar', en: 'Contribute' },
  navValidate: { so: 'Hubi', en: 'Validate' },
  navDashboard: { so: 'Bogagayga', en: 'Dashboard' },
  navLeaderboard: { so: 'Hormoodka', en: 'Leaderboard' },
  navAdmin: { so: 'Maamul', en: 'Admin' },
  login: { so: 'Gal', en: 'Log in' },
  logout: { so: 'Ka bax', en: 'Log out' },
  join: { so: 'Ku biir', en: 'Join' },

  // Landing
  heroTitle: {
    so: 'Qor Af-Soomaali',
    en: 'Qor Af-Soomaali — Write Somali',
  },
  heroSub: {
    so: 'Ka qayb qaado dhisidda kaydka ugu weyn ee qoraalka af-Soomaaliga ah — furan, tayo leh, hanti u ah dadka ku hadla af-Soomaaliga.',
    en: 'Help build the largest open, quality-controlled Somali text corpus — a public asset for every Somali speaker.',
  },
  statSentences: { so: 'jumlado la hubiyay', en: 'validated sentences' },
  statContributors: { so: 'wax-ku-biiriyayaal', en: 'contributors' },
  statPending: { so: 'sugaya hubin', en: 'awaiting validation' },
  ctaStart: { so: 'Bilow hadda', en: 'Start now' },
  ctaHow: { so: 'Sida ay u shaqayso', en: 'How it works' },

  // Modes
  modeWrite: { so: 'Qor', en: 'Write' },
  modeWriteDesc: {
    so: 'Ka jawaab su’aalo qoraal ah oo af-Soomaali ah — sheekooyin, tilmaamo, hadal maalinle ah.',
    en: 'Respond to writing prompts in Somali — stories, instructions, everyday speech.',
  },
  modeTranslate: { so: 'Turjun', en: 'Translate' },
  modeTranslateDesc: {
    so: 'U turjun jumlado kooban Ingiriisi ilaa af-Soomaali.',
    en: 'Translate short English sentences into Somali.',
  },
  modeTranscribe: { so: 'Guuri', en: 'Transcribe' },
  modeTranscribeDesc: {
    so: 'Qoraal ahaan u guuri buugaag iyo qoraallo daabacan oo xor ah.',
    en: 'Type up openly licensed printed Somali material.',
  },
  modeValidate: { so: 'Hubi', en: 'Validate' },
  modeValidateDesc: {
    so: 'Eeg qoraallada dadka kale: ma sax baa? Ku dar codkaaga.',
    en: 'Review others’ submissions: is it correct Somali? Cast your vote.',
  },

  // Contribution flow
  yourAnswer: { so: 'Jawaabtaada (af-Soomaali)', en: 'Your answer (in Somali)' },
  submit: { so: 'Gudbi', en: 'Submit' },
  skip: { so: 'Ka bood', en: 'Skip' },
  submitted: { so: 'Waa la gudbiyay. Mahadsanid!', en: 'Submitted. Thank you!' },
  nextTask: { so: 'Hawl kale', en: 'Next task' },
  noTasks: {
    so: 'Hawlo cusub ma jiraan hadda. Soo noqo mar dambe.',
    en: 'No new tasks right now. Check back soon.',
  },
  translateThis: { so: 'Turjun jumladan:', en: 'Translate this sentence:' },
  transcribeThis: { so: 'Guuri qoraalkan:', en: 'Transcribe this text:' },
  minLength: {
    so: 'Jawaabtu waa inay ugu yaraan 10 xaraf tahay.',
    en: 'Answers must be at least 10 characters.',
  },

  // Validation flow
  validateQuestion: {
    so: 'Qoraalkani ma af-Soomaali sax ah baa?',
    en: 'Is this correct, natural Somali?',
  },
  approve: { so: 'Haa, waa sax', en: 'Yes, correct' },
  reject: { so: 'Maya, khalad baa ku jira', en: 'No, has problems' },
  promptWas: { so: 'Su’aashu waxay ahayd:', en: 'The prompt was:' },
  sourceWas: { so: 'Jumlada Ingiriisiga:', en: 'The English source:' },
  nothingToValidate: {
    so: 'Wax sugaya hubin ma jiraan. Soo noqo mar dambe.',
    en: 'Nothing waiting for validation. Check back soon.',
  },

  // Dashboard
  dashboardTitle: { so: 'Bogagayga', en: 'My dashboard' },
  contributions: { so: 'Wax-ku-biirin', en: 'Contributions' },
  accepted: { so: 'La aqbalay', en: 'Accepted' },
  pending: { so: 'Sugaya', en: 'Pending' },
  rejected: { so: 'La diiday', en: 'Rejected' },
  validationsDone: { so: 'Hubin la sameeyay', en: 'Validations done' },
  reputation: { so: 'Sumcad', en: 'Reputation' },
  recentWork: { so: 'Shaqadaadii u dambaysay', en: 'Your recent work' },

  // Leaderboard
  leaderboardTitle: { so: 'Hormoodka', en: 'Leaderboard' },
  leaderboardSub: {
    so: 'Dadka ugu badan ee wax ku biiriyay kaydka.',
    en: 'Top contributors to the corpus.',
  },

  // Auth
  email: { so: 'Iimayl', en: 'Email' },
  password: { so: 'Furaha sirta', en: 'Password' },
  handle: { so: 'Magaca la arki karo', en: 'Display name' },
  handleHint: {
    so: 'Magacaaga dhabta ah ama magac beddel — adigaa dooranaya.',
    en: 'Your real name or a pseudonym — your choice.',
  },
  joinTitle: { so: 'Ku biir Unkad', en: 'Join Unkad' },
  loginTitle: { so: 'Gal Unkad', en: 'Log in to Unkad' },
  haveAccount: { so: 'Akoon ma leedahay?', en: 'Already have an account?' },
  noAccount: { so: 'Akoon ma lihid?', en: 'No account yet?' },
  licenseNotice: {
    so: 'Wax kasta oo aad ku darto waxaa lagu sii daayaa shati furan (CC BY-SA). Kaydku waa hanti guud.',
    en: 'Everything you contribute is released under an open license (CC BY-SA). The corpus is a public asset.',
  },

  // Errors
  errEmailTaken: { so: 'Iimaylkan hore ayaa loo isticmaalay.', en: 'That email is already registered.' },
  errBadLogin: { so: 'Iimayl ama furaha sirta ayaa khaldan.', en: 'Wrong email or password.' },
  errRequired: { so: 'Fadlan buuxi dhammaan meelaha.', en: 'Please fill in all fields.' },
} as const;

export type TKey = keyof typeof dict;

export function t(lang: Lang, key: TKey): string {
  return dict[key][lang];
}

export function makeT(lang: Lang) {
  return (key: TKey) => t(lang, key);
}
