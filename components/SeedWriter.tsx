'use client';

// The writing surface for an invited author.
//
// One type only: an ordinary question and the answer a good assistant should
// give. Refusals and controls are written by Khalid, because a refusal set
// wants one consistent policy and several hands produce several policies.
//
// The store is Postgres, not the browser, so no volunteer loses an evening's
// work to a cleared cache. Only the paragraph being typed right now is held
// locally, to survive a closed tab.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { saveItem, updateItem, deleteItem } from '@/lib/seed';

type Item = {
  id: string; ref: string; type: string; sector: string;
  instruction: string; response: string; note: string | null;
};
type L = Record<string, string>;

// Subjects for every sector, so any pairing of two can be handed out. Chosen
// for things a model trained mostly on English answers generically or gets
// wrong: local procedure, seasonal names, how it actually works here. A
// subject that ChatGPT already handles well teaches us nothing.
const SUBJECTS: Record<string, string[]> = {
  culture: ['a proverb and the moment it is used', 'poetry forms and who performs them',
    'wedding customs and how they differ by region', 'naming and lineage',
    'the rules of hospitality', 'dress for particular occasions', 'games children play',
    'songs sung while working', 'how a story is told aloud', 'elders settling a dispute',
    'what gift suits what occasion', 'mourning customs', 'henna and celebration',
    'food made for a special day', 'how respect is shown in the way people speak'],
  media: ['telling a false story from a true one online', 'what the radio stations cover',
    'writing up a news report', 'interviewing someone', 'social media and reputation',
    'photographing people and asking permission', 'rumours during a crisis',
    'reporting safely', 'making an audio programme',
    'how a story travels through the diaspora', 'advertising honestly',
    'reporting as an ordinary citizen', 'translating news out of English',
    'headlines that overstate', 'what makes a source worth trusting'],
  business: ['opening a small shop', 'setting prices', 'keeping accounts on paper',
    'giving customers credit and collecting it', 'importing goods and what it costs',
    'partnerships and splitting profit', 'hawala and remittances', 'employing relatives',
    'renting a stall', 'competing in a crowded market', 'ayuuto and saving groups',
    'recovering after a loss', 'suppliers and trust', 'opening a second location',
    'taxes and the fees a trader pays'],
  health: ['a child\u2019s fever at home before reaching a clinic', 'recognising malaria',
    'what a midwife checks during pregnancy', 'rehydration for a child with diarrhoea',
    'traditional remedies and when to stop relying on them', 'the childhood vaccination schedule',
    'eating with diabetes using local foods', 'the health effects of khat',
    'treating drinking water at home', 'wound care with what is on hand',
    'how families talk about mental distress', 'TB symptoms and the stigma around them',
    'when a cough needs a clinic', 'eye infections in dusty seasons',
    'feeding a child who is not growing'],
  education: ['studying for exams without light at night', 'teaching a class of mixed ages',
    'what makes a good madrasa teacher', 'learning to read as an adult',
    'choosing between subjects', 'university admission requirements',
    'what studying abroad involves', 'teaching children to write Somali',
    'a child who refuses to go to school', 'managing exam stress',
    'how families handle school fees', 'learning English as a Somali speaker',
    'the calculation methods traders use', 'getting hold of books',
    'how teachers are trained'],
  agriculture: ['planting with the gu and deyr rains', 'common camel illnesses',
    'keeping goats and sheep', 'storing sorghum and maize', 'irrigating from the river',
    'preparing for drought and when to destock', 'handling milk and souring it',
    'pests on the crop', 'pricing livestock for sale', 'fodder in the dry season',
    'keeping bees', 'fishing and preserving the catch', 'what improves the soil',
    'reaching a vet', 'moving herds and grazing rights'],
  law: ['how inheritance shares are worked out', 'what a marriage contract sets out',
    'divorce and what happens to the children', 'land disputes and who decides them',
    'xeer compared with the courts', 'compensation after an injury',
    'registering a business', 'agreements between traders with nothing written',
    'what a police report requires', 'what a tenant can expect from a landlord',
    'debt and how it is collected', 'who can serve as a witness', 'custody of children',
    'getting identity documents', 'if property is seized'],
  religion: ['prayer times as the seasons shift', 'fasting when ill or travelling',
    'calculating zakat on livestock and on trade goods', 'funeral rites and their timing',
    'what makes a marriage valid', 'interest and the alternatives to it',
    'methods of Quran memorisation', 'making up missed prayers', 'the rules of slaughter',
    'ablution when water is scarce', 'how the two Eids differ', 'charity beyond zakat',
    'religious schooling for young children', 'shortening prayer while travelling',
    'settling a disagreement about practice'],
  technology: ['sending money by phone and the fees', 'when a transfer goes to the wrong number',
    'choosing a phone', 'internet bundles and what they cost',
    'spotting a scam on WhatsApp or Facebook', 'backing up photos',
    'typing Somali on a phone keyboard', 'solar panels and batteries',
    'charging a phone without mains power', 'keeping a shop\u2019s records on a phone',
    'video calls to relatives abroad', 'passwords and account security',
    'what SIM registration requires', 'setting up satellite TV or radio',
    'getting a cracked screen repaired'],
  general: ['giving directions where streets have no names', 'what to do when the power goes',
    'borrowing and lending between neighbours', 'choosing a child\u2019s name',
    'greetings that change with age and status', 'visiting someone who is sick',
    'keeping a house cool in heat', 'storing and rationing water at home',
    'what to do when a phone is lost', 'writing a short letter to an official',
    'planning a journey between cities', 'the etiquette of sharing a meal',
    'arranging a household budget', 'negotiating a price in the market',
    'what a guest is owed and for how long'],
};

function dist1(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, diff = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diff > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  if (i < a.length || j < b.length) diff++;
  return diff <= 1;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();

export default function SeedWriter({
  token, name, sectors, perSector, initial, labels, sectorNames,
}: {
  token: string; name: string; sectors: string[]; perSector: number;
  initial: Item[]; labels: L; sectorNames: Record<string, string>;
}) {
  const [items, setItems] = useState<Item[]>(initial);
  const [sector, setSector] = useState(
    sectors.find((s) => initial.filter((i) => i.sector === s).length < perSector) ?? sectors[0]
  );
  const [ins, setIns] = useState('');
  const [res, setRes] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<Item | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // 118KB of vocabulary has no business in the JS bundle, so it is fetched
  // once. The checks simply do nothing until it lands.
  const [vocab, setVocab] = useState<{ v: Set<string>; byLen: Record<number, string[]> } | null>(null);
  const [okWords, setOkWords] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch('/seed-vocab.json').then((r) => r.json()).then((d) => {
      const byLen: Record<number, string[]> = {};
      for (const w of d.freq) (byLen[w.length] ||= []).push(w);
      setVocab({ v: new Set<string>(d.vocab), byLen });
      setOkWords(new Set<string>(d.certified));
    }).catch(() => {});
  }, []);

  const draftKey = `seed_draft_${token.slice(0, 8)}`;
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) || '{}');
      if (d.ins) setIns(d.ins);
      if (d.res) setRes(d.res);
      if (d.note) setNote(d.note);
      if (d.sector && sectors.includes(d.sector)) setSector(d.sector);
    } catch {}
  }, [draftKey, sectors]);
  useEffect(() => {
    if (!loaded.current) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ ins, res, note, sector })); } catch {}
  }, [ins, res, note, sector, draftKey]);

  const nOf = (s: string) => items.filter((i) => i.sector === s).length;
  const total = sectors.length * perSector;
  const full = nOf(sector) >= perSector && !editing;
  const allDone = items.length >= total;

  // Mechanical only. Nothing here judges whether the Somali is good; that
  // stays with the person writing it, and no hint blocks a save.
  const hints = useMemo(() => {
    const out: { text: string; word?: string }[] = [];
    if (!vocab) return out;
    const seen = new Set<string>();
    for (const w of norm(`${ins} ${res}`).split(' ')) {
      if (w.length < 4 || vocab.v.has(w) || okWords.has(w) || seen.has(w)) continue;
      seen.add(w);
      const cands: string[] = [];
      for (const L2 of [w.length - 1, w.length, w.length + 1]) {
        for (const c of vocab.byLen[L2] || []) if (dist1(w, c)) cands.push(c);
      }
      if (cands.length) {
        out.push({
          word: w,
          text: `${w} ${labels.hintUnknown} ${cands.slice(0, 3).join(', ')}. ${labels.hintYours}`,
        });
      }
    }
    if (res && res[0] !== res[0].toUpperCase()) out.push({ text: labels.hintLower });
    const n = norm(ins);
    if (n.length > 8) {
      const dup = items.find((x) => x.id !== editing?.id && norm(x.instruction) === n);
      if (dup) out.push({ text: `${labels.hintDup} (${dup.ref}).` });
    }
    return out;
  }, [ins, res, vocab, okWords, items, editing, labels]);

  function reset() { setIns(''); setRes(''); setNote(''); setEditing(null); setErr(null); }

  function submit() {
    if (!ins.trim() || !res.trim()) return;
    start(async () => {
      const payload = { type: 'task', sector, instruction: ins, response: res, note };
      const e = editing
        ? await updateItem(token, editing.id, payload)
        : await saveItem(token, payload);
      if (e) { setErr(e.replace(/^ERR:/, '')); return; }
      if (editing) {
        setItems((xs) => xs.map((x) => (x.id === editing.id ? { ...x, ...payload, note } : x)));
      } else {
        setItems((xs) => [...xs, {
          id: crypto.randomUUID(),
          ref: 's' + String(xs.length + 1).padStart(4, '0'),
          ...payload, note,
        }]);
      }
      reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  return (
    <div className="seed-wrap">
      <div className="seed-top">
        <span className="seed-who">{labels.thanks}, {name}</span>
        <span className="seed-count"><b>{items.length}</b> / {total}</span>
      </div>

      <div className="seed-sectors">
        {sectors.map((s) => {
          const n = nOf(s);
          return (
            <button
              key={s}
              className={`seed-sector${sector === s ? ' on' : ''}${n >= perSector ? ' done' : ''}`}
              onClick={() => setSector(s)}
            >
              <span className="nm">{sectorNames[s] ?? s}</span>
              <span className="fr">{n}/{perSector}</span>
              <span className="tr"><i style={{ width: `${(n / perSector) * 100}%` }} /></span>
            </button>
          );
        })}
      </div>

      {allDone ? (
        <p className="seed-done">{labels.done}</p>
      ) : (
        <>
          <details className="seed-how" open={items.length < 3}>
            <summary>{labels.howTitle}</summary>
            <p>{labels.how}</p>
          </details>

          <label className="seed-field">
            <span className="seed-label">{labels.question} <i>{labels.questionHint}</i></span>
            <textarea className="seed-ta q" lang="so" rows={2}
              value={ins} onChange={(e) => setIns(e.target.value)} />
          </label>

          <label className="seed-field">
            <span className="seed-label">{labels.answer} <i>{labels.answerHint}</i></span>
            <textarea className="seed-ta a" lang="so" rows={8}
              value={res} onChange={(e) => setRes(e.target.value)} />
          </label>

          <details className="seed-note">
            <summary>{labels.note}</summary>
            <textarea className="seed-ta n" rows={2}
              value={note} onChange={(e) => setNote(e.target.value)} />
          </details>

          {hints.length > 0 && (
            <div className="seed-hints">
              {hints.map((h, i) => (
                <div key={i}>
                  <span>{h.text}</span>
                  {h.word && (
                    <button className="seed-mini"
                      onClick={() => setOkWords((s) => new Set(s).add(h.word!))}>
                      {labels.itIsAWord}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {full && <p className="seed-error">{labels.full}</p>}
          {err && <p className="seed-error">{err}</p>}

          <div className="seed-actions">
            <button className="seed-btn"
              disabled={pending || full || !ins.trim() || !res.trim()} onClick={submit}>
              {pending ? labels.saving : editing ? `${labels.update} ${editing.ref}` : labels.save}
            </button>
            {editing && (
              <button className="seed-plain" onClick={reset}>{labels.cancelEdit}</button>
            )}
          </div>

          <details className="seed-panel">
            <summary>{labels.subjects}: {sectorNames[sector] ?? sector}</summary>
            <ul>{(SUBJECTS[sector] || []).map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="seed-hintline">{labels.subjectsHint}</p>
          </details>
        </>
      )}

      <details className="seed-panel">
        <summary>{labels.written} ({items.length})</summary>
        {items.length === 0 && <p className="seed-hintline">{labels.nothingYet}</p>}
        {items.slice().reverse().map((it) => (
          <div className="seed-row" key={it.id}>
            <div lang="so" className="txt">{it.instruction}</div>
            <div className="meta">
              <span>{it.ref} &middot; {sectorNames[it.sector] ?? it.sector} &middot; {it.response.length} {labels.chars}</span>
              <button className="seed-mini" onClick={() => {
                setEditing(it); setSector(it.sector);
                setIns(it.instruction); setRes(it.response); setNote(it.note || '');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>{labels.edit}</button>
              <button className="seed-mini danger" onClick={() => {
                if (!confirm(labels.confirmDelete)) return;
                start(async () => {
                  await deleteItem(token, it.id);
                  setItems((xs) => xs.filter((x) => x.id !== it.id));
                });
              }}>{labels.delete}</button>
            </div>
          </div>
        ))}
      </details>

      {editing && <div className="seed-editbar">{labels.editing} <b>{editing.ref}</b></div>}
    </div>
  );
}
