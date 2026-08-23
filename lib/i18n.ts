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
  navHome: { so: 'Guriga', en: 'Home' },
  navContribute: { so: 'Wax ku dar', en: 'Contribute' },
  navValidate: { so: 'Hubi', en: 'Validate' },
  navDashboard: { so: 'Bogagayga', en: 'Dashboard' },
  navLeaderboard: { so: 'Hormoodka', en: 'Leaderboard' },
  navAdmin: { so: 'Maamul', en: 'Admin' },
  login: { so: 'Gal', en: 'Log in' },
  logout: { so: 'Ka bax', en: 'Log out' },
  join: { so: 'Ku biir', en: 'Join' },

  // Personal goals. Somali reviewed by Khalid Yusuf Dahir 2026-08-15.
  goalCardTitle: { so: 'Yoolkaaga toddobaadkan', en: 'Your goal this week' },
  goalWelcomeTitle: {
    so: 'Kusoo dhawoow. Ma samaysanaysaa yool toddobaadle?',
    en: 'Welcome. Want to set a weekly goal?',
  },
  goalSkip: {
    so: 'Ka bood, oo si caadi ah wax ugu biiri',
    en: 'Skip, and contribute the classic way',
  },
  goalSetCta: { so: 'Samee yool toddobaadle', en: 'Set a weekly goal' },
  goalSetHint: {
    so: 'Dooro inta jumladood ee aad qori doonto iyo inta aad hubin doonto toddobaadkiiba. Yool yar oo joogto ah ayaan ku gaaraynaa 100,000 oo jumladood.',
    en: 'Choose how many sentences you will write and how many you will validate each week. Small steady goals reach 100,000.',
  },
  goalWriteLabel: { so: 'Jumlado aan qori doono toddobaadkiiba', en: 'Sentences I will write per week' },
  goalValidateLabel: { so: 'Hubin aan samayn doono toddobaadkiiba', en: 'Validations I will do per week' },
  goalNotifyLabel: {
    so: 'Iigu soo dir email ku saabsan yoolkayga',
    en: 'Email me about my goal',
  },
  goalNotifyHint: {
    so: 'Hal iimeyl toddobaadkiiba, oo ku saabsan yoolkaaga keliya. Ma jiro iimeylo kale.',
    en: 'One email a week, about your goal only. No generic blasts.',
  },
  goalSave: { so: 'Kaydi yoolka', en: 'Save goal' },
  goalClearHint: {
    so: 'Labada tiro eber ka dhig si aad yoolka u tirtirto.',
    en: 'Set both numbers to zero to clear your goal.',
  },
  goalWritten: { so: 'qorran', en: 'written' },
  goalValidated: { so: 'hubiyay', en: 'validated' },
  goalDaysMissed: { so: 'maalmood oo maqan', en: 'days missed' },
  goalEdit: { so: 'Wax ka beddel yoolka', en: 'Edit goal' },
  goalShareLine: {
    so: 'Yoolkaagu waa qayb ka mid ah 100,000-ka. Waad garan kartaa saamaynta.',
    en: 'Your goal is a slice of the 100,000. You can see your share move it.',
  },
  goalShareOf: { so: 'saamigaaga inta hadhay', en: 'your share of what remains' },
  goalPace: { so: 'jumlado 12 toddobaad gudahood, haddaad sii socoto', en: 'sentences in 12 weeks at this pace' },
  goalWeekWindow: { so: '7-dii maalmood ee u dambeeyay', en: 'last 7 days' },

  // Visitor mode. Somali reviewed by Khalid Yusuf Dahir 2026-08-15.
  guestCta: { so: 'Isku day adigoo aan is-diiwaangelin', en: 'Try it without signing up' },
  guestTitle: { so: 'Ku bilow marti ahaan', en: 'Start as a visitor' },
  guestIntro: {
    so: 'Wax kuma qorna: magac, email, ama password midna uma baahnid. Waxaad u baahan tahay oggolaansho keliya. Waxa aad qorto iyo yoolka aad samayso way kuu hadhayaan, haddii aad mar dambe ku biirtana way ku raacayaan.',
    en: 'No name, no email, no password. Only consent is required. What you write and any goal you set is kept, and if you join later it all comes with you.',
  },
  guestConsentLabel: {
    so: 'Waan oggolahay in qoraalkaygu ku biiro kaydka furan ee CC BY-SA 4.0',
    en: 'I agree that my text joins the open corpus under CC BY-SA 4.0',
  },
  guestDialectLabel: { so: 'Lahjaddaada (ikhtiyaari)', en: 'Your dialect (optional)' },
  guestStart: { so: 'Bilow', en: 'Start' },
  guestNotice: {
    so: 'Waxaad ku jirtaa qaab marti. Ku biir si aad magac iyo email ugu darsato; waxaad qortay way kuu hadhayaan.',
    en: 'You are in visitor mode. Join to add a name and email; everything you wrote stays yours.',
  },
  guestJoinCta: { so: 'Ku biir oo keydso shaqadaada', en: 'Join and keep your work' },
  guestNoEmailHint: {
    so: 'Email ma lihid weli. Ku biir si aad u hesho warbixinta yoolkaaga.',
    en: 'No email yet. Join to receive your goal follow-up.',
  },

  // Landing
  heroTitle: { so: 'Qor Af-Soomaali', en: 'Qor Af-Soomaali — Write Somali' },
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
  modeProverb: { so: 'Maahmaah', en: 'Proverb' },
  modeProverbDesc: {
    so: 'La wadaag maahmaah Soomaaliyeed — qor maahmaahda, turjumaadeeda iyo macnaheeda.',
    en: 'Share a Somali proverb — the proverb, its translation, and its meaning.',
  },
  proverbField: { so: 'Maahmaahda (af-Soomaali)', en: 'The proverb (in Somali)' },
  translationField: { so: 'Turjumaad toos ah (Ingiriisi)', en: 'Literal translation (English)' },
  meaningField: {
    so: 'Macnaha iyo goorta la isticmaalo (Ingiriisi)',
    en: 'Meaning, and when it is used (English)',
  },
  proverbIntro: {
    so: 'Maahmaah kasta oo aad taqaanno waa hanti. Ku qor sida aad ka maqashay.',
    en: 'Every proverb you know is wealth. Write it as you heard it.',
  },
  alwaysOpen: { so: 'mar walba furan', en: 'always open' },
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
  // Submit failures. Shown in place of the old silent bounce that lost text.
  errShort: {
    so: 'Qoraalku aad buu u gaaban yahay. Fadlan wax yar oo dheeraad ah ku qor.',
    en: 'That is too short. Please write a little more.',
  },
  errCap: {
    so: 'Waxaad gaadhay xadka maalinlaha ah. Mahadsanid! Fadlan soo laabo berri.',
    en: 'You have reached today’s limit. Thank you! Please come back tomorrow.',
  },
  errUnavailable: {
    so: 'Hawshan hadda lama heli karo. Waxaa laguu soo bandhigay mid cusub.',
    en: 'That task is no longer available. Here is a new one.',
  },
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
  chars: { so: 'xaraf', en: 'characters' },

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
  escalatedNote: {
    so: 'Qoraalkan waa la isku khilaafay — codkaagu waa kama-dambays.',
    en: 'Validators disagreed on this one — your vote settles it.',
  },

  // Onboarding
  onboardingTitle: { so: 'Soo dhawoow Unkad', en: 'Welcome to Unkad' },
  stepAccount: { so: 'Akoon', en: 'Account' },
  stepProfile: { so: 'Xog', en: 'Profile' },
  stepConsent: { so: 'Ogolaansho', en: 'Consent' },
  profileTitle: { so: 'Nagu saabsan yara sheeg', en: 'Tell us a little about yourself' },
  profileWhy: {
    so: 'Lahjaddaadu waxay ka dhigtaa kaydka mid matalaya dhammaan dadka ku hadla af-Soomaaliga.',
    en: 'Your dialect helps make the corpus representative of all Somali speakers.',
  },
  dialectLabel: { so: 'Lahjadda aad ku hadasho', en: 'Your dialect' },
  dialectMaxaa: { so: 'Maxaa tiri', en: 'Maxaa tiri (Standard)' },
  dialectMaay: { so: 'Maay', en: 'Maay' },
  dialectBoth: { so: 'Labadaba', en: 'Both' },
  dialectOther: { so: 'Mid kale', en: 'Other' },
  regionLabel: { so: 'Gobolka / magaalada (ikhtiyaari)', en: 'Region / city (optional)' },
  countryLabel: { so: 'Dalka aad ku nooshahay (ikhtiyaari)', en: 'Country you live in (optional)' },
  continue: { so: 'Sii wad', en: 'Continue' },

  consentTitle: { so: 'Ogolaanshaha xogta', en: 'Data consent' },
  consentBody1: {
    so: 'Wax kasta oo aad ku darto Unkad waxaa lagu sii daayaa shati furan (CC BY-SA 4.0). Taasi waxay la macno tahay in cid kastaa — cilmi-baarayaal, horumariyayaal, iyo bulshada Soomaaliyeed — ay si xor ah u isticmaali karaan.',
    en: 'Everything you contribute to Unkad is released under an open license (CC BY-SA 4.0). That means anyone — researchers, developers, and the Somali community itself — can use it freely.',
  },
  consentBody2: {
    so: 'Xogtaada gaarka ah (iimaylka, furaha sirta) waligeed lama sii daayo. Waxaa la sii daayaa oo keliya qoraalka aad ku darto kaydka.',
    en: 'Your personal data (email, password) is never released. Only the text you contribute to the corpus is.',
  },
  creditLabel: { so: 'Sidee baa lagugu magacaabaa?', en: 'How should we credit you?' },
  creditHandle: { so: 'Magaca la arki karo', en: 'My display name' },
  creditRealName: { so: 'Magacayga dhabta ah', en: 'My real name' },
  creditAnonymous: { so: 'Magac la’aan (qarsoodi)', en: 'Anonymous' },
  creditNameLabel: { so: 'Magacaaga dhabta ah', en: 'Your real name' },
  agreeLabel: {
    so: 'Waan ogolahay in wax-ku-biirintayda lagu sii daayo shati furan (CC BY-SA 4.0).',
    en: 'I agree that my contributions are released under the open CC BY-SA 4.0 license.',
  },
  finish: { so: 'Dhammee', en: 'Finish' },

  // Home (signed-in)
  greeting: { so: 'Nabad,', en: 'Nabad,' },
  todayLabel: { so: 'maanta', en: 'today' },
  streakLabel: { so: 'maalmo isku xigta', en: 'day streak' },
  corpusProgress: { so: 'Horumarka kaydka', en: 'Corpus progress' },
  goalSuffix: { so: 'jumlado — yoolka olole', en: 'sentences — campaign goal' },
  tasksAvailable: { so: 'hawlo diyaar ah', en: 'tasks open' },
  keepGoing: { so: 'Shaqo wanaagsan — sii wad.', en: 'Good work — keep going.' },
  last14: { so: '14-kii maalmood ee u dambeeyay', en: 'Last 14 days' },
  acceptanceRate: { so: 'Heerka aqbalaadda', en: 'Acceptance rate' },
  byRegister: { so: 'Noocyada qoraalka (la aqbalay)', en: 'By register (accepted)' },

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
  charsLabel: { so: 'xaraf', en: 'characters' },
  lbPendingLegend: { so: 'sugaya hubin', en: 'awaiting validation' },
  lbEmpty: {
    so: 'Weli qofna wax kuma darin. Noqo kii ugu horreeyay.',
    en: 'Nobody has contributed yet. Be the first.',
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

  // Review (linguist verification)
  navReview: { so: 'Xaqiijin', en: 'Review' },
  reviewTitle: { so: 'Xaqiijinta af-yaqaannada', en: 'Linguist review' },
  reviewSub: {
    so: 'Qoraallada bulshadu aqbashay — xaqiiji si ay kaydka rasmiga ah ugu darsamaan.',
    en: 'Items the community accepted — verify them so they enter the official corpus.',
  },
  verifySelected: { so: 'Xaqiiji kuwa la doortay', en: 'Verify selected' },
  selectAll: { so: 'Dooro dhammaan', en: 'Select all' },
  overturn: { so: 'Diid', en: 'Overturn' },
  verifiedCount: { so: 'waa la xaqiijiyay', en: 'verified' },
  nothingToReview: {
    so: 'Wax sugaya xaqiijin ma jiraan.',
    en: 'Nothing waiting for review.',
  },
  verifiedLabel: { so: 'La xaqiijiyay', en: 'Verified' },

  // Editor
  editorBold: { so: 'Dhumuc weyn', en: 'Bold' },
  editorItalic: { so: 'Jiiran', en: 'Italic' },
  editorHeading: { so: 'Cinwaan', en: 'Heading' },
  editorQuote: { so: 'Xigasho', en: 'Quote' },
  editorList: { so: 'Liis', en: 'List' },
  editorPreview: { so: 'Fiiri', en: 'Preview' },
  editorWrite: { so: 'Qor', en: 'Write' },
  // !! VERIFY SOMALI !!
  editorDone: { so: 'Ka bax diiradda', en: 'Leave focus' },
  editorFocus: { so: 'Diirad', en: 'Focus' },
  editorWords: { so: 'erey', en: 'words' },
  draftRestored: { so: 'Qabyo-qoraal hore ayaa la soo celiyay.', en: 'A saved draft was restored.' },

  // Theme
  themeDark: { so: 'Madow', en: 'Dark' },
  themeLight: { so: 'Iftiin', en: 'Light' },

  // Sectors
  // Sector picker  !! VERIFY SOMALI !!
  chooseSector: { so: 'Dooro qaybta', en: 'Choose a sector' },
  sectorAll: { so: 'Dhammaan', en: 'All' },

  // Free write  !! VERIFY SOMALI !!
  modeFree: { so: 'Qoraal xor ah', en: 'Free write' },
  modeFreeDesc: {
    so: 'Qor mowduuc aad adigu dooratay — sheeko, waaya-aragnimo, aqoon aad leedahay.',
    en: 'Write about a topic of your own — a story, an experience, knowledge you hold.',
  },
  freeWriteIntro: {
    so: 'Dooro qaybta uu qoraalkaagu khuseeyo, oo qor af-Soomaali saafi ah. Mowduucu waa ikhtiyaari.',
    en: 'Choose the sector your writing belongs to, and write in natural Somali. The topic line is optional.',
  },
  topicField: { so: 'Mowduuca (ikhtiyaari)', en: 'Topic (optional)' },
  ownTopicNudge: {
    so: 'Ma leedahay mowduuc kuu gaar ah?',
    en: 'Have a topic of your own?',
  },
  errSector: { so: 'Fadlan dooro qaybta.', en: 'Please choose a sector.' },
  freeWriteTag: { so: 'Mowduuc gaar ah', en: 'Own topic' },

  sector_health: { so: 'Caafimaad', en: 'Health' },
  sector_education: { so: 'Waxbarasho', en: 'Education' },
  sector_agriculture: { so: 'Beeraha', en: 'Agriculture' },
  sector_law: { so: 'Sharci', en: 'Law' },
  sector_media: { so: 'Warbaahin', en: 'Media' },
  sector_religion: { so: 'Diin', en: 'Religion' },
  sector_culture: { so: 'Dhaqan', en: 'Culture' },
  sector_technology: { so: 'Tignoolajiyad', en: 'Technology' },
  sector_general: { so: 'Guud', en: 'General' },
  // Not in the corpus sector enum: the seed set defines its own sectors.
  sector_business: { so: 'Ganacsi', en: 'Business' },

  // Account / password  !! VERIFY SOMALI !!
  accountTitle: { so: 'Akoonkayga', en: 'My account' },
  changePassword: { so: 'Beddel furaha sirta', en: 'Change password' },
  currentPassword: { so: 'Furaha sirta ee hadda', en: 'Current password' },
  newPassword: { so: 'Furaha sirta ee cusub', en: 'New password' },
  passwordChanged: { so: 'Furaha sirta waa la beddelay.', en: 'Password changed.' },
  passwordHint: {
    so: 'Ugu yaraan 8 xaraf. Marka aad beddesho, aaladaha kale waa laga saarayaa.',
    en: 'At least 8 characters. Changing it signs you out on every other device.',
  },

  // Errors
  errEmailTaken: { so: 'Iimaylkan hore ayaa loo isticmaalay.', en: 'That email is already registered.' },
  // !! VERIFY SOMALI !! — new strings, founder to review.
  forgotPassword: { so: 'Furaha sirta ma illowday?', en: 'Forgotten your password?' },
  forgotTitle: { so: 'Soo celi furaha sirta', en: 'Recover your password' },
  forgotIntro: {
    so: 'Geli iimaylkaaga. Haddii akoon laga helo, waxaan kuu diri doonaa xiriir aad ku beddesho furaha sirta.',
    en: 'Enter your email. If an account exists, we will send you a link to set a new password.',
  },
  resetRequested: {
    so: 'Waa la helay codsigaaga. Haddii iimaylkaas akoon laga helo, xiriir baa laguu soo dirayaa.',
    en: 'Request received. If that email has an account, a link will be sent to it.',
  },
  errResetInvalid: {
    so: 'Xiriirkan waa dhacay ama horey ayaa loo isticmaalay. Weydiiso mid cusub.',
    en: 'This link has expired or was already used. Ask for a new one.',
  },
  // !! VERIFY SOMALI !!
  unsubTitle: { so: 'Iimaylka waa la joojiyay', en: 'Emails stopped' },
  unsubDone: {
    so: 'Mar dambe xasuusin iimayl ah kaama soo dirayno. Akoonkaagu wuu shaqeynayaa, waxaadna wali qori kartaa markasta oo aad doonto.',
    en: 'We will not send you reminder emails again. Your account still works and you can write whenever you want.',
  },
  unsubAlready: {
    so: 'Horey ayaad u joojisay iimaylada xasuusinta.',
    en: 'You had already stopped reminder emails.',
  },
  unsubInvalid: {
    so: 'Xiriirkan ma shaqeynayo. Haddii aad rabto inaad joojiso iimaylada, nala soo xiriir.',
    en: 'This link does not work. Contact us if you want to stop the emails.',
  },
  unsubResubscribe: {
    so: 'Mar kale ma rabtaa inaad hesho warbixinta?',
    en: 'Want to receive updates again?',
  },
  unsubResubscribed: {
    so: 'Waad ku soo noqotay. Mahadsanid.',
    en: 'You are back on the list. Thank you.',
  },
  errBadLogin: { so: 'Iimayl ama furaha sirta ayaa khaldan.', en: 'Wrong email or password.' },
  errRequired: { so: 'Fadlan buuxi dhammaan meelaha.', en: 'Please fill in all fields.' },
  errLocked: {
    so: 'Akoonkan waa la xannibay 15 daqiiqo — isku day badan oo khaldan. Sug kadibna mar kale isku day.',
    en: 'Account locked for 15 minutes after too many failed attempts. Please wait and try again.',
  },
  errRateLimited: {
    so: 'Isku dayo aad u badan. Fadlan sug waxoogaa, kadibna mar kale isku day.',
    en: 'Too many attempts. Please wait a while and try again.',
  },
  errConsentRequired: {
    so: 'Si aad wax ugu darto, waa inaad ogolaato shatiga furan.',
    en: 'You must accept the open license to contribute.',
  },
  errPasswordShort: {
    so: 'Furaha cusub waa inuu ka koobnaadaa ugu yaraan 8 xaraf.',
    en: 'The new password must be at least 8 characters.',
  },
  errWrongPassword: {
    so: 'Furaha sirta ee hadda waa khaldan yahay.',
    en: 'That is not your current password.',
  },
  // ---- Seed set (invited authors) -----------------------------------------
  // !! SOMALI NOT YET REVIEWED !! Drafted by Claude, awaiting Khalid's read
  // before any invite link is sent. Nothing here should reach a real writer
  // until that happens.
  seedWelcome: { so: 'Ku soo dhawoow', en: 'Welcome' },
  seedConsentIntro: {
    so: 'Waxaa lagugu casuumay inaad naga caawiso qorista ururinta ugu horreysa ee su\u2019aalo iyo jawaabo Af-Soomaali ah. Su\u2019aalo dad dhab ah weydiin lahaayeen, mid walbana jawaabteeda ay tahay inuu bixiyo caawiye wanaagsan. Labada dhinacba adigaa qoraya.',
    en: 'You have been invited to help write the first Somali instruction set: real questions a Somali speaker would ask, each with the answer a good assistant should give. You write both halves.',
  },
  seedConsentTitle: { so: 'Ka hor inta aanad bilaabin', en: 'Before you start' },
  seedConsentP1: {
    so: 'Waxa aad qorto wuxuu noqonayaa qayb ka mid ah xog furan oo loo isticmaalo tababarka iyo tijaabinta moodallada luqadda ee Af-Soomaaliga.',
    en: 'Your writing becomes part of an openly published dataset used to train and test language models on Somali.',
  },
  seedConsentP2: {
    so: 'Waxaa lagu sii daayaa shatiga CC-BY-SA-4.0, oo ah kan ay ururintayada kale oo dhan qabto.',
    en: 'It is released under CC-BY-SA-4.0, the same licence the rest of our corpus carries.',
  },
  seedConsentP3: {
    so: 'Waxaa lagugu magacaabayaa magaca aad hoos ka doorato. Wax kasta oo aad rabto ku qor, naanays haddii aad doonto.',
    en: 'You are credited by the name you choose below. Anything you like, including a nickname.',
  },
  seedConsentP4: {
    so: 'Kaliya erayadaada qor. Waxba ha ka koobin website, waxbana ha ka soo qaadan ChatGPT ama moodal kale.',
    en: 'Write only your own words. Nothing copied from a website, and nothing generated by ChatGPT or any other model.',
  },
  seedConsentP5: {
    so: 'Wixii aad qorto waad beddeli kartaa ama tirtiri kartaa, wakhti kasta, isla xiriirkan.',
    en: 'You can change or delete anything you have written, at any time, from this same link.',
  },
  seedCreditLabel: { so: 'Igu magacaab', en: 'Credit me as' },
  seedAgree: {
    so: 'Waan akhriyay oo waan ogolahay in qoraalkayga lagu daabaco xogta shatiga CC-BY-SA-4.0.',
    en: 'I have read the above and I agree my writing may be published in the dataset under CC-BY-SA-4.0.',
  },
  seedAgreeCta: { so: 'Ogolow oo bilow qorista', en: 'Agree and start writing' },

  seedThanks: { so: 'Mahadsanid', en: 'Thank you' },
  seedHowTitle: { so: 'Sida loo qoro', en: 'How to write these' },
  seedHow: {
    so: 'Weydii su\u2019aal qof Soomaali ah dhab ahaan weydiin lahaa, mid jawaabteedu u baahan tahay aqoon ama garasho. Kadib qor jawaabta aad jeclaan lahayd inuu bixiyo caawiye: sax, dabiici ah, oo dherer ahaan u dhiganta su\u2019aasha. Haddii ChatGPT uu horeba u jawaabi karo si fiican, waxba nama tarayso, marka weydii wax qofka halkan jooga oo keliya yaqaan.',
    en: 'Ask a question a Somali speaker would really ask, one whose answer needs knowledge or judgement. Then write the answer you would want an assistant to give: correct, natural, and as long as the question deserves. If ChatGPT could already answer it well it teaches us nothing, so ask something only someone here would know.',
  },
  seedQuestion: { so: 'SU\u2019AASHA', en: 'THE QUESTION' },
  seedQuestionHint: { so: 'waxa qofku weydiinayo', en: 'what the person asks' },
  seedAnswer: { so: 'JAWAABTA', en: 'THE ANSWER' },
  seedAnswerHint: {
    so: 'waxa jawaab wanaagsan noqon lahayd',
    en: 'what a good assistant should reply',
  },
  seedNote: { so: 'Wax aad noo sheegayso (ikhtiyaari)', en: 'A note for us (optional)' },
  seedSave: { so: 'Kaydi oo mid kale qor', en: 'Save and write another' },
  seedSaving: { so: 'Waa la kaydinayaa\u2026', en: 'Saving\u2026' },
  seedUpdate: { so: 'Cusboonaysii', en: 'Update' },
  seedCancelEdit: { so: 'Daa sidii uu ahaa', en: 'Leave it as it was' },
  seedEditing: { so: 'Waxaad wax ka beddelaysaa', en: 'You are editing' },
  seedFull: {
    so: 'Qaybtan waa buuxday. Mid kale ka dooro kore.',
    en: 'This one is full. Pick another above.',
  },
  seedDone: { so: 'Waad dhammaysay. Mahadsanid.', en: 'You are finished. Thank you.' },
  seedSubjects: { so: 'Haddii aad fikrad la\u2019dahay', en: 'If you are stuck for ideas' },
  seedSubjectsHint: {
    so: 'Kuwani waa mawduucyo, ma aha su\u2019aalo. Su\u2019aashaada u qor mid ka mid ah, kadibna jawaabta. Mawduuc kastaa wuxuu inta badan saddex su\u2019aal qaadaa: qof markii ugu horreysay weydiinaya, wax qaldamay, iyo laba doorasho oo la isbarbardhigayo.',
    en: 'These are subjects, not questions. Write your own question about one of them, then the answer. One subject usually carries three: someone asking for the first time, something that went wrong, and comparing two options.',
  },
  seedWritten: { so: 'Waxa aad qortay', en: 'What you have written' },
  seedNothingYet: { so: 'Weli waxba ma jiraan.', en: 'Nothing yet.' },
  seedEdit: { so: 'wax ka beddel', en: 'edit' },
  seedDelete: { so: 'tirtir', en: 'delete' },
  seedConfirmDelete: { so: 'Ma tirtiraa midkan?', en: 'Delete this one?' },
  seedItIsAWord: { so: 'waa eray sax ah', en: 'it is a word' },
  seedChars: { so: 'xaraf', en: 'characters' },
  seedHintUnknown: {
    so: 'ma jiro liiskayaga la hubiyay. Wuxuu u dhow yahay',
    en: 'is not in our verified list. Close to',
  },
  seedHintYours: {
    so: 'Suurtogal waa in kaagu sax yahay.',
    en: 'Yours may well be right.',
  },
  seedHintLower: {
    so: 'Jawaabtu waxay ku bilaabmaysaa xaraf yar.',
    en: 'The answer starts with a small letter.',
  },
  seedHintDup: { so: 'Horey ayaad u qortay tan', en: 'You already wrote this one' },

  // "Unug mise Qof?" game — !! VERIFY SOMALI !!
  unugGameTitle: { so: 'Unug mise Qof?', en: 'Unug or Human?' },
  unugGameIntro: {
    so: 'Unug waa AI aad u yar oo Unkad Labs tababartay. Jumlad kasta hoos ka akhri, kadibna sheeg: ma Unug ayaa qoray mise qof dhab ah? Jumladaha dadku waxay ka yimaadeen kaydka la sii daayay; kuwa Unug waa wax-soo-saarkiisa oo aan waxba laga beddelin.',
    en: 'Unug is a tiny AI trained by Unkad Labs. Read each sentence and guess: written by Unug, or by a real person? Human sentences come from the released corpus; Unug lines are raw, unretouched model output.',
  },
  unugGameQuestion: { so: 'Yaa qoray jumladan?', en: 'Who wrote this sentence?' },
  unugGameBtnUnug: { so: 'Unug (AI)', en: 'Unug (AI)' },
  unugGameBtnHuman: { so: 'Qof', en: 'A human' },
  unugGameCorrect: { so: 'Sax!', en: 'Correct!' },
  unugGameWrong: { so: 'Khalad!', en: 'Wrong!' },
  unugGameWasUnug: { so: 'Tan waxaa qoray Unug.', en: 'This one was Unug.' },
  unugGameWasHuman: { so: 'Tan waxaa qoray qof.', en: 'This one was a human.' },
  unugGameNext: { so: 'Kan xiga', en: 'Next' },
  unugGameScoreTitle: { so: 'Natiijadaada', en: 'Your score' },
  unugGameScoreLine: { so: '{score} / {total}', en: '{score} / {total}' },
  unugGamePerfect: {
    so: 'Dhammaan waad garatay. Unug wali ma ku khiyaanayn karo.',
    en: 'You caught them all. Unug cannot fool you yet.',
  },
  unugGameFooled: {
    so: 'Unug wuxuu ku khiyaaneeyay {n} jeer. AI-gu wuu soo koraya.',
    en: 'Unug fooled you {n} times. The AI is growing.',
  },
  unugGamePlayAgain: { so: 'Mar kale ciyaar', en: 'Play again' },
  unugGameCta: {
    so: 'Jumlad kasta oo aad qortaa waxay Unug ka dhigaysaa mid Soomaali si fiican u yaqaan.',
    en: 'Every sentence you write teaches Unug better Somali.',
  },
  unugGameCtaBtn: { so: 'Ku biir oo qor', en: 'Join and write' },
} as const;

export type TKey = keyof typeof dict;

export function t(lang: Lang, key: TKey): string {
  return dict[key][lang];
}

export function makeT(lang: Lang) {
  return (key: TKey) => t(lang, key);
}

export function sectorLabel(lang: Lang, sector: string | null): string {
  const key = `sector_${sector}` as TKey;
  return sector && key in dict ? t(lang, key) : (sector ?? '—');
}

export function dialectLabel(lang: Lang, dialect: string | null): string {
  switch (dialect) {
    case 'maxaa_tiri':
      return t(lang, 'dialectMaxaa');
    case 'maay':
      return t(lang, 'dialectMaay');
    case 'both':
      return t(lang, 'dialectBoth');
    case 'other':
      return t(lang, 'dialectOther');
    default:
      return '—';
  }
}
