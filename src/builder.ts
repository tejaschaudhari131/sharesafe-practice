import { CATALOG, packHash, packUrl, QR_COMFORT, QR_MAX, validatePack, type Lang, type LText, type Pack } from './pack';
import { builtinIdFromHash, decode, summarize } from './resume';
import type { StrKey } from './i18n';

interface Q {
  prompt: string;
  promptEs: string;
  choices: [string, string, string, string];
  choicesEs: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  hint: string;
  hintEs: string;
  explanation: string;
  explanationEs: string;
}

interface Draft {
  id: string;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  includeEs: boolean;
  pre: Q[];
  practice: Q[];
  post: Q[];
}

const blankQ = (): Q => ({
  prompt: '', promptEs: '',
  choices: ['', '', '', ''], choicesEs: ['', '', '', ''],
  answer: 0, hint: '', hintEs: '', explanation: '', explanationEs: '',
});

const BT: Record<string, { en: string; es: string }> = {
  includeEs: { en: 'Include Spanish text', es: 'Incluir texto en español' },
  titleEs: { en: 'Title in Spanish (optional)', es: 'Título en español (opcional)' },
  descEs: { en: 'Description in Spanish (optional)', es: 'Descripción en español (opcional)' },
  promptEs: { en: 'Prompt in Spanish (optional)', es: 'Enunciado en español (opcional)' },
  choiceEs: { en: 'Choice {n} in Spanish', es: 'Opción {n} en español' },
  hintEs: { en: 'Hint in Spanish (optional)', es: 'Pista en español (opcional)' },
  explEs: { en: 'Explanation in Spanish (optional)', es: 'Explicación en español (opcional)' },
  sectionTag: { en: 'Section', es: 'Sección' },
  tagPre: { en: 'Pre-check', es: 'Prueba inicial' },
  tagPractice: { en: 'Practice', es: 'Práctica' },
  tagPost: { en: 'Post-check', es: 'Prueba final' },
  verifyH: { en: 'Teacher Verify', es: 'Verificación para docentes' },
  verifyHelp: {
    en: 'Paste a student’s completion or resume code. It encodes a pack id and pre/post scores, and no personal data. The checksum catches typos; it is not forgery-proof.',
    es: 'Pega el código de finalización o de continuación de un estudiante. Codifica el id del pack y los puntajes inicial y final, sin datos personales. La suma de comprobación detecta errores de tipeo; no es una prueba contra falsificaciones.',
  },
  verifyLabel: { en: 'Student code', es: 'Código del estudiante' },
  verifyBtn: { en: 'Verify code', es: 'Verificar código' },
  verifyTypo: { en: 'This code has a typo or is incomplete.', es: 'Este código tiene un error de tipeo o está incompleto.' },
  verifyUnknown: { en: 'Pack hash {h} (not a built-in pack loaded here).', es: 'Hash del pack {h} (no es un pack integrado cargado aquí).' },
  verifyResult: {
    en: 'Pack: {pack}. Pre-check {pre}/{preCount}. Post-check {post}/{postCount}. Stage {stage}. No personal data is in the code.',
    es: 'Pack: {pack}. Prueba inicial {pre}/{preCount}. Prueba final {post}/{postCount}. Etapa {stage}. El código no contiene datos personales.',
  },
  verifyHonest: {
    en: 'The checksum catches typo and neighbour-swap errors. It does not stop someone from deliberately crafting a code.',
    es: 'La suma de comprobación detecta errores de tipeo y de caracteres vecinos intercambiados. No impide que alguien invente un código a propósito.',
  },
};

export interface BuilderDeps {
  main: HTMLElement;
  t: (key: StrKey, vars?: Record<string, string | number>) => string;
  esc: (s: string) => string;
  lang: Lang;
  onHome: () => void;
  onTry: (pack: Pack) => void;
  customPack?: Pack | null;
}

export function showBuilder(deps: BuilderDeps) {
  const { main, t, esc, lang, onHome, onTry, customPack } = deps;
  const $ = <T extends HTMLElement>(sel: string) => main.querySelector(sel) as T;
  const bt = (key: string, vars?: Record<string, string | number>) => {
    let s = (BT[key]?.[lang] ?? BT[key]?.en ?? key);
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    return s;
  };

  const draft: Draft = {
    id: 'my-pack', title: '', titleEs: '', description: '', descriptionEs: '', includeEs: false,
    pre: [blankQ()], practice: [blankQ()], post: [blankQ()],
  };

  function read() {
    draft.id = ($<HTMLInputElement>('#b-id')).value.trim() || 'my-pack';
    draft.title = ($<HTMLInputElement>('#b-title')).value;
    draft.description = ($<HTMLInputElement>('#b-desc')).value;
    const esBox = $<HTMLInputElement>('#b-include-es');
    draft.includeEs = !!esBox?.checked;
    if (draft.includeEs) {
      draft.titleEs = ($<HTMLInputElement>('#b-title-es'))?.value ?? draft.titleEs;
      draft.descriptionEs = ($<HTMLTextAreaElement>('#b-desc-es'))?.value ?? draft.descriptionEs;
    }
    const readSec = (sec: 'pre' | 'practice' | 'post') => {
      draft[sec] = [...main.querySelectorAll(`[data-sec=${sec}] .q-card`)].map((card) => {
        const inp = (name: string) => (card.querySelector(`[data-f=${name}]`) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
        const choices: [string, string, string, string] = [inp('c0'), inp('c1'), inp('c2'), inp('c3')];
        const choicesEs: [string, string, string, string] = [inp('ce0'), inp('ce1'), inp('ce2'), inp('ce3')];
        const answer = Number((card.querySelector('[data-f=ans]') as HTMLSelectElement).value) as 0 | 1 | 2 | 3;
        return {
          prompt: inp('prompt'), promptEs: inp('promptEs'),
          choices, choicesEs, answer,
          hint: inp('hint'), hintEs: inp('hintEs'),
          explanation: inp('expl'), explanationEs: inp('explEs'),
        };
      });
    };
    readSec('pre'); readSec('practice'); readSec('post');
  }

  const L = (en: string, es?: string): LText => {
    const out: LText = { en: { std: en, plain: en } };
    if (draft.includeEs && es?.trim()) out.es = { std: es.trim(), plain: es.trim() };
    return out;
  };

  function toPack(): ReturnType<typeof validatePack> {
    const items = (list: Q[], prefix: string, skill: string) => list.filter((q) => q.prompt.trim()).map((q, i) => {
      const usable = q.choices.map((c, j) => ({
        id: String(j),
        text: L(c.trim(), q.choicesEs[j]),
      })).filter((c) => c.text.en.std);
      const choices = usable.length ? usable : [{ id: '0', text: L('Choice 1') }, { id: '1', text: L('Choice 2') }];
      const ansId = choices.some((c) => c.id === String(q.answer)) ? String(q.answer) : choices[0].id;
      return {
        id: `${prefix}-${i + 1}`, skill, kind: 'choice' as const,
        prompt: L(q.prompt.trim(), q.promptEs),
        choices, answer: ansId,
        hints: q.hint.trim() ? [L(q.hint.trim(), q.hintEs)] : undefined,
        explanation: q.explanation.trim() ? L(q.explanation.trim(), q.explanationEs) : undefined,
      };
    });
    const pre = items(draft.pre, 'pre', 'general');
    const practice = items(draft.practice, 'prac', 'general');
    const post = items(draft.post, 'post', 'general');
    const raw = {
      id: draft.id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'my-pack',
      version: 1,
      title: L(draft.title.trim() || 'Untitled pack', draft.titleEs),
      description: L(draft.description.trim() || 'A custom lesson pack.', draft.descriptionEs),
      skills: [{ id: 'general', name: L('Practice', draft.includeEs ? 'Práctica' : undefined) }],
      stageTarget: Math.max(1, practice.length),
      checkLength: pre.length,
      pre, practice, post,
    };
    return validatePack(raw);
  }

  function section(sec: 'pre' | 'practice' | 'post', title: string): string {
    return `<section data-sec="${sec}" aria-labelledby="${sec}-h">
      <h2 id="${sec}-h">${esc(title)}</h2>
      ${draft[sec].map((q, i) => qCard(sec, i, q)).join('')}
      <div class="row"><button type="button" class="secondary" data-add="${sec}">${esc(t('addQ'))}</button></div>
    </section>`;
  }

  function qCard(sec: string, i: number, q: Q): string {
    const choices = q.choices.map((c, j) =>
      `<label>${esc(t('choiceN', { n: j + 1 }))}<input data-f="c${j}" class="wide" value="${esc(c)}"></label>` +
      (draft.includeEs ? `<label lang="es">${esc(bt('choiceEs', { n: j + 1 }))}<input data-f="ce${j}" class="wide" lang="es" value="${esc(q.choicesEs[j] || '')}"></label>` : '')
    ).join('');
    const opts = q.choices.map((_, j) => `<option value="${j}" ${q.answer === j ? 'selected' : ''}>${j + 1}</option>`).join('');
    const secOpts = (['pre', 'practice', 'post'] as const).map((s) =>
      `<option value="${s}" ${s === sec ? 'selected' : ''}>${esc(bt(s === 'pre' ? 'tagPre' : s === 'post' ? 'tagPost' : 'tagPractice'))}</option>`).join('');
    return `<div class="q-card" data-i="${i}">
      <label>${esc(bt('sectionTag'))}<select data-move="${sec}:${i}">${secOpts}</select></label>
      <label>${esc(t('promptL'))}<textarea data-f="prompt">${esc(q.prompt)}</textarea></label>
      ${draft.includeEs ? `<label lang="es">${esc(bt('promptEs'))}<textarea data-f="promptEs" lang="es">${esc(q.promptEs)}</textarea></label>` : ''}
      ${choices}
      <label>${esc(t('correctChoice'))}<select data-f="ans">${opts}</select></label>
      <label>${esc(t('hintOpt'))}<input data-f="hint" class="wide" value="${esc(q.hint)}"></label>
      ${draft.includeEs ? `<label lang="es">${esc(bt('hintEs'))}<input data-f="hintEs" class="wide" lang="es" value="${esc(q.hintEs)}"></label>` : ''}
      <label>${esc(t('explainOpt'))}<textarea data-f="expl">${esc(q.explanation)}</textarea></label>
      ${draft.includeEs ? `<label lang="es">${esc(bt('explEs'))}<textarea data-f="explEs" lang="es">${esc(q.explanationEs)}</textarea></label>` : ''}
      <div class="row"><button type="button" class="danger secondary" data-del="${sec}:${i}">${esc(t('removeQ'))}</button></div>
    </div>`;
  }

  function paint(keepFocus?: string) {
    const built = toPack();
    const urlInfo = built.ok ? packUrl(location.origin, location.pathname, built.pack) : null;
    const fallbackBytes = new TextEncoder().encode(JSON.stringify(draft)).length;
    const errors = built.ok ? '' : `<div id="builder-errors" role="alert"><p>${esc(t('builderErrors'))}</p><ul>${built.errors.map((e) => `<li>${esc(e.path)}: ${esc(e.message)}</li>`).join('')}</ul></div>`;
    let qrNote = '';
    if (urlInfo) {
      qrNote = urlInfo.qr === 'ok' ? t('qrOk') : urlInfo.qr === 'tight' ? t('qrTight') : t('qrTooBig', { n: urlInfo.urlLength, lim: QR_MAX });
    }
    main.innerHTML = `
      <div id="builder-ui">
        <h1>${esc(t('builderTitle'))}</h1>
        <p>${esc(t('builderLead'))}</p>
        <label class="check"><input type="checkbox" id="b-include-es" ${draft.includeEs ? 'checked' : ''}> ${esc(bt('includeEs'))}</label>
        <label>${esc(t('packTitle'))}<input id="b-title" class="wide" value="${esc(draft.title)}"></label>
        ${draft.includeEs ? `<label lang="es">${esc(bt('titleEs'))}<input id="b-title-es" class="wide" lang="es" value="${esc(draft.titleEs)}"></label>` : ''}
        <label>${esc(t('packDesc'))}<textarea id="b-desc">${esc(draft.description)}</textarea></label>
        ${draft.includeEs ? `<label lang="es">${esc(bt('descEs'))}<textarea id="b-desc-es" lang="es">${esc(draft.descriptionEs)}</textarea></label>` : ''}
        <label>${esc(t('packId'))}<input id="b-id" class="wide" value="${esc(draft.id)}" pattern="[a-z0-9-]{1,40}"></label>
        ${section('pre', t('sectionPre'))}
        ${section('practice', t('sectionPractice'))}
        ${section('post', t('sectionPost'))}
        ${errors}
        <section class="card byte" aria-labelledby="byte-h" aria-live="polite">
          <h2 id="byte-h">${esc(t('byteH'))}</h2>
          <p>${esc(t('byteJson', { n: urlInfo ? urlInfo.jsonBytes : fallbackBytes }))}</p>
          <p>${esc(t('byteUrl', { n: urlInfo ? urlInfo.urlLength : 0 }))}</p>
          <p>${esc(qrNote)}</p>
          <p class="hint-text">${QR_COMFORT}–${QR_MAX}</p>
        </section>
        <section class="card" aria-labelledby="verify-h">
          <h2 id="verify-h">${esc(bt('verifyH'))}</h2>
          <p>${esc(bt('verifyHelp'))}</p>
          <p class="hint-text">${esc(bt('verifyHonest'))}</p>
          <form id="verify-form" novalidate>
            <label for="verify-code">${esc(bt('verifyLabel'))}</label>
            <input id="verify-code" class="wide" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <div class="row"><button type="submit">${esc(bt('verifyBtn'))}</button></div>
          </form>
          <p id="verify-out" role="status" aria-live="polite"></p>
        </section>
        <div class="row">
          <button type="button" id="b-export">${esc(t('exportJson'))}</button>
          <label class="check">${esc(t('importJson'))}<input id="b-import" type="file" accept="application/json,.json"></label>
          <button type="button" class="secondary" id="b-print">${esc(t('printHandout'))}</button>
          <button type="button" id="b-try">${esc(t('tryPack'))}</button>
          <button type="button" class="secondary" id="b-home">${esc(t('back'))}</button>
        </div>
        <p id="b-err" role="alert"></p>
      </div>
      <div id="handout" class="handout" hidden></div>`;
    bind();
    if (keepFocus) (main.querySelector(keepFocus) as HTMLElement | null)?.focus();
    else { const h = main.querySelector('h1') as HTMLElement; h.tabIndex = -1; h.focus(); }
    document.title = `${t('builderTitle')} · ShareSafe Practice`;
  }

  function bind() {
    const sync = () => { read(); };
    const live = () => { sync(); updateBytes(); };
    main.querySelectorAll('#builder-ui input,#builder-ui textarea,#builder-ui select').forEach((el) => {
      if ((el as HTMLElement).id === 'b-import' || (el as HTMLElement).id === 'verify-code') return;
      el.addEventListener('input', live);
      el.addEventListener('change', live);
    });
    $('#b-include-es')?.addEventListener('change', () => { sync(); paint('#b-include-es'); });
    main.querySelectorAll('[data-add]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sync();
        const sec = (btn as HTMLElement).dataset.add as 'pre' | 'practice' | 'post';
        if (draft[sec].length < 6) draft[sec].push(blankQ());
        paint();
      });
    });
    main.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sync();
        const [sec, i] = ((btn as HTMLElement).dataset.del || '').split(':') as ['pre' | 'practice' | 'post', string];
        if (draft[sec].length > 1) draft[sec].splice(Number(i), 1);
        paint();
      });
    });
    main.querySelectorAll('[data-move]').forEach((sel) => {
      sel.addEventListener('change', () => {
        sync();
        const [from, idx] = ((sel as HTMLElement).dataset.move || '').split(':') as ['pre' | 'practice' | 'post', string];
        const to = (sel as HTMLSelectElement).value as 'pre' | 'practice' | 'post';
        if (to === from) return;
        const i = Number(idx);
        const [item] = draft[from].splice(i, 1);
        if (!draft[from].length) draft[from].push(blankQ());
        draft[to].push(item);
        paint();
      });
    });
    $('#b-home').addEventListener('click', onHome);
    $('#b-export').addEventListener('click', () => {
      sync();
      const r = toPack();
      if (!r.ok) { paint(); return; }
      const blob = new Blob([JSON.stringify(r.pack, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${r.pack.id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('#b-import').addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const raw = JSON.parse(await file.text());
        const r = validatePack(raw);
        if (!r.ok) { $('#b-err').textContent = r.errors.map((er) => `${er.path}: ${er.message}`).join(' '); return; }
        fillFromPack(r.pack); paint();
      } catch {
        $('#b-err').textContent = t('importErr');
      }
    });
    const tryBtn = $('#b-try');
    if (tryBtn) tryBtn.addEventListener('click', () => {
      sync();
      const r = toPack();
      if (r.ok) onTry(r.pack);
      else paint();
    });
    const printBtn = $('#b-print');
    if (printBtn) printBtn.addEventListener('click', async () => {
      sync();
      const r = toPack();
      if (!r.ok) { paint(); return; }
      const info = packUrl(location.origin, location.pathname, r.pack);
      if (info.qr === 'too-big') { paint(); return; }
      const { qrSvg } = await import('./qr');
      const hand = $('#handout');
      hand.hidden = false;
      const esTitle = r.pack.title.es?.std;
      const esDesc = r.pack.description.es?.std;
      hand.innerHTML = `<h1>${esc(t('handoutTitle'))}</h1>
        <h2>${esc(r.pack.title.en.std)}</h2>
        ${esTitle ? `<p lang="es"><strong>${esc(esTitle)}</strong></p>` : ''}
        <p>${esc(r.pack.description.en.std)}</p>
        ${esDesc ? `<p lang="es">${esc(esDesc)}</p>` : ''}
        <p>${esc(t('handoutHow'))}</p>
        <figure class="qr">${qrSvg(info.url, t('handoutQrLabel'))}</figure>
        <p class="handout-url">${esc(info.url)}</p>`;
      window.print();
    });
    const form = $('#verify-form') as HTMLFormElement | null;
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = ($('#verify-code') as HTMLInputElement).value;
      const out = $('#verify-out');
      const r = decode(raw);
      if (!r.ok) { out.textContent = bt('verifyTypo'); return; }
      const s = summarize(r.progress);
      const builtin = builtinIdFromHash(s.packHash);
      let packName = bt('verifyUnknown', { h: String(s.packHash) });
      if (builtin) {
        const entry = CATALOG.find((c) => c.id === builtin)!;
        packName = lang === 'es' && entry.title.es ? entry.title.es.std : entry.title.en.std;
      } else {
        const built = toPack();
        const candidates = [customPack, built.ok ? built.pack : null].filter(Boolean) as Pack[];
        for (const c of candidates) {
          if (packHash(c) === s.packHash) { packName = c.title.en.std; break; }
        }
      }
      out.textContent = bt('verifyResult', {
        pack: packName, pre: s.pre, preCount: s.preCount || s.pre, post: s.post, postCount: s.postCount || s.post, stage: s.stage,
      });
    });
  }

  function updateBytes() {
    const r = toPack();
    const box = main.querySelector('.byte');
    if (!box) return;
    const urlInfo = r.ok ? packUrl(location.origin, location.pathname, r.pack) : null;
    const fallbackBytes = new TextEncoder().encode(JSON.stringify(draft)).length;
    const qrNote = urlInfo
      ? (urlInfo.qr === 'ok' ? t('qrOk') : urlInfo.qr === 'tight' ? t('qrTight') : t('qrTooBig', { n: urlInfo.urlLength, lim: QR_MAX }))
      : '';
    box.innerHTML = `<h2 id="byte-h">${esc(t('byteH'))}</h2>
      <p>${esc(t('byteJson', { n: urlInfo ? urlInfo.jsonBytes : fallbackBytes }))}</p>
      <p>${esc(t('byteUrl', { n: urlInfo ? urlInfo.urlLength : 0 }))}</p>
      <p>${esc(qrNote)}</p>`;
  }

  function fillFromPack(pack: Pack) {
    draft.id = pack.id;
    draft.title = pack.title.en.std;
    draft.titleEs = pack.title.es?.std ?? '';
    draft.description = pack.description.en.std;
    draft.descriptionEs = pack.description.es?.std ?? '';
    draft.includeEs = !!(pack.title.es || pack.description.es || pack.pre.some((i) => i.prompt.es));
    const loadItems = (items: Pack['pre']): Q[] => {
      const out = items.filter((it) => it.kind === 'choice' || it.kind === 'message').map((it) => {
        const ch = (it.choices ?? []).slice(0, 4);
        while (ch.length < 4) ch.push({ id: String(ch.length), text: { en: { std: '', plain: '' } } });
        const answerIdx = Math.max(0, ch.findIndex((c) => c.id === it.answer)) as 0 | 1 | 2 | 3;
        const q = blankQ();
        q.prompt = it.prompt.en.std;
        q.promptEs = it.prompt.es?.std ?? '';
        q.choices = ch.map((c) => c.text.en.std) as [string, string, string, string];
        q.choicesEs = ch.map((c) => c.text.es?.std ?? '') as [string, string, string, string];
        q.answer = answerIdx < 0 ? 0 : answerIdx;
        q.hint = it.hints?.[0]?.en.std ?? '';
        q.hintEs = it.hints?.[0]?.es?.std ?? '';
        q.explanation = it.explanation?.en.std ?? '';
        q.explanationEs = it.explanation?.es?.std ?? '';
        return q;
      });
      return out.length ? out : [blankQ()];
    };
    draft.pre = loadItems(pack.pre);
    draft.practice = Array.isArray(pack.practice) ? loadItems(pack.practice) : [blankQ()];
    draft.post = loadItems(pack.post);
  }

  paint();
}
