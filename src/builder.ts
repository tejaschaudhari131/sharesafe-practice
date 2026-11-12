import { packUrl, QR_COMFORT, QR_MAX, validatePack, type Pack } from './pack';
import type { StrKey } from './i18n';

interface Q {
  prompt: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  hint: string;
  explanation: string;
}

interface Draft {
  id: string;
  title: string;
  description: string;
  pre: Q[];
  practice: Q[];
  post: Q[];
}

const blankQ = (): Q => ({ prompt: '', choices: ['', '', '', ''], answer: 0, hint: '', explanation: '' });

export interface BuilderDeps {
  main: HTMLElement;
  t: (key: StrKey, vars?: Record<string, string | number>) => string;
  esc: (s: string) => string;
  lang: 'en' | 'es';
  onHome: () => void;
  onTry: (pack: Pack) => void;
}

export function showBuilder(deps: BuilderDeps) {
  const { main, t, esc, onHome, onTry } = deps;
  const draft: Draft = {
    id: 'my-pack',
    title: '',
    description: '',
    pre: [blankQ()],
    practice: [blankQ()],
    post: [blankQ()],
  };

  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => main.querySelector(sel) as T;

  function read() {
    draft.id = ($<HTMLInputElement>('#b-id')).value.trim() || 'my-pack';
    draft.title = ($<HTMLInputElement>('#b-title')).value;
    draft.description = ($<HTMLInputElement>('#b-desc')).value;
    const readSec = (sec: 'pre' | 'practice' | 'post') => {
      draft[sec] = [...main.querySelectorAll(`[data-sec=${sec}] .q-card`)].map((card) => {
        const inp = (name: string) => (card.querySelector(`[data-f=${name}]`) as HTMLInputElement | HTMLTextAreaElement).value;
        const choices: [string, string, string, string] = [inp('c0'), inp('c1'), inp('c2'), inp('c3')];
        const answer = Number((card.querySelector('[data-f=ans]') as HTMLSelectElement).value) as 0 | 1 | 2 | 3;
        return { prompt: inp('prompt'), choices, answer, hint: inp('hint'), explanation: inp('expl') };
      });
    };
    readSec('pre'); readSec('practice'); readSec('post');
  }

  function toPack(): ReturnType<typeof validatePack> {
    const L = (s: string) => ({ en: { std: s, plain: s } });
    const items = (list: Q[], prefix: string, skill: string) => list.filter((q) => q.prompt.trim()).map((q, i) => {
      const usable = q.choices.map((c, j) => ({ id: String(j), text: L(c.trim()) })).filter((c) => c.text.en.std);
      const choices = usable.length ? usable : [{ id: '0', text: L('Choice 1') }, { id: '1', text: L('Choice 2') }];
      const ansId = choices.some((c) => c.id === String(q.answer)) ? String(q.answer) : choices[0].id;
      return {
        id: `${prefix}-${i + 1}`, skill, kind: 'choice' as const, prompt: L(q.prompt.trim()),
        choices, answer: ansId,
        hints: q.hint.trim() ? [L(q.hint.trim())] : undefined,
        explanation: q.explanation.trim() ? L(q.explanation.trim()) : undefined,
      };
    });
    const pre = items(draft.pre, 'pre', 'general');
    const practice = items(draft.practice, 'prac', 'general');
    const post = items(draft.post, 'post', 'general');
    const raw = {
      id: draft.id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'my-pack',
      version: 1,
      title: L(draft.title.trim() || 'Untitled pack'),
      description: L(draft.description.trim() || 'A custom lesson pack.'),
      skills: [{ id: 'general', name: L('Practice') }],
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
      `<label>${esc(t('choiceN', { n: j + 1 }))}<input data-f="c${j}" class="wide" value="${esc(c)}"></label>`).join('');
    const opts = q.choices.map((_, j) => `<option value="${j}" ${q.answer === j ? 'selected' : ''}>${j + 1}</option>`).join('');
    return `<div class="q-card" data-i="${i}">
      <label>${esc(t('promptL'))}<textarea data-f="prompt">${esc(q.prompt)}</textarea></label>
      ${choices}
      <label>${esc(t('correctChoice'))}<select data-f="ans">${opts}</select></label>
      <label>${esc(t('hintOpt'))}<input data-f="hint" class="wide" value="${esc(q.hint)}"></label>
      <label>${esc(t('explainOpt'))}<textarea data-f="expl">${esc(q.explanation)}</textarea></label>
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
        <label>${esc(t('packTitle'))}<input id="b-title" class="wide" value="${esc(draft.title)}"></label>
        <label>${esc(t('packDesc'))}<textarea id="b-desc">${esc(draft.description)}</textarea></label>
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
      if ((el as HTMLElement).id === 'b-import') return;
      el.addEventListener('input', live);
      el.addEventListener('change', live);
    });
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
      hand.innerHTML = `<h1>${esc(t('handoutTitle'))}</h1>
        <h2>${esc(r.pack.title.en.std)}</h2>
        <p>${esc(r.pack.description.en.std)}</p>
        <p>${esc(t('handoutHow'))}</p>
        <figure class="qr">${qrSvg(info.url, t('handoutQrLabel'))}</figure>
        <p class="hint-text">${esc(info.url.length > 80 ? info.url.slice(0, 60) + '…' : info.url)}</p>`;
      window.print();
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
    draft.description = pack.description.en.std;
    const loadItems = (items: Pack['pre']): Q[] => {
      const out = items.filter((it) => it.kind === 'choice' || it.kind === 'message').map((it) => {
        const ch = (it.choices ?? []).slice(0, 4);
        while (ch.length < 4) ch.push({ id: String(ch.length), text: { en: { std: '', plain: '' } } });
        const answerIdx = Math.max(0, ch.findIndex((c) => c.id === it.answer)) as 0 | 1 | 2 | 3;
        return {
          prompt: it.prompt.en.std,
          choices: ch.map((c) => c.text.en.std) as [string, string, string, string],
          answer: answerIdx < 0 ? 0 : answerIdx,
          hint: it.hints?.[0]?.en.std ?? '',
          explanation: it.explanation?.en.std ?? '',
        };
      });
      return out.length ? out : [blankQ()];
    };
    draft.pre = loadItems(pack.pre);
    draft.practice = Array.isArray(pack.practice) ? loadItems(pack.practice) : [blankQ()];
    draft.post = loadItems(pack.post);
  }

  paint();
}
