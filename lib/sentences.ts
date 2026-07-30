// Somali sentence segmentation, typed for the app.
//
// The implementation lives in ./sentences.mjs as plain JavaScript, because the
// operational scripts (status.mjs, milestone.mjs, corpus-data.mjs) run under
// plain node and must share the identical definition. They each used to carry
// their own inline copy, which meant the public counters, the milestone watcher
// and the published dataset could report three different sentence counts for
// the same corpus. They did.
//
// ---------------------------------------------------------------------------
// Why this is hand-written at all
//
// Corpus builders normally reach for a trained segmenter: Punkt, PySBD, spaCy,
// Stanza, or the Moses/SRX rules used in machine-translation pipelines. None of
// them supports Somali. There is no Somali model in spaCy or Stanza, no Somali
// rule set in PySBD, and no Somali Universal Dependencies treebank to train on.
// So there was no standard to adopt, only one to write and then measure.
//
// scripts/sentence-gold-prepare.mjs builds a human annotation task and
// scripts/sentence-eval.mjs scores this against it as boundary precision,
// recall and F1 — the metrics the segmentation literature reports, so the
// number is comparable to what exists for other languages.
//
// Milestones are stated in sentences (2,000 to benchmark a model, 50,000 to
// finetune one) while every raw counter tracks characters, and the two are not
// interchangeable: one 2,900-character essay and 2,900 characters of short
// translated lines are worth very different amounts to a benchmark.

export { splitSentences, isUsableSentence, countSentences } from './sentences.mjs';
