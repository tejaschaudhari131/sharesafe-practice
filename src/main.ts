import './style.css';
import { t, type StrKey } from './i18n';
import {
  CATALOG, catalogEntry, decodePackHash, hasLocale, isGenerated, packHash, pickText, practiceItems,
  type AccessLevel, type BuiltinId, type Item, type Lang, type LText, type Pack, type RoleId,
  validatePack,
} from './pack';
import { gradeItem } from './grade';
import { decode, encode, newProgress, normalizeInput, bitCount, summarize, type Progress } from './resume';
import { defaultSettings, endSession, load, save, measureProgressStorage, type Settings } from './storage';

// ---------- state ----------
const saved = load();
let settings: Settings = { ...defaultSettings(), ...(saved?.settings ?? {}) };
if (settings.lang !== 'es') settings.lang = 'en';
let packId: string = saved?.packId && (catalogEntry(saved.packId) || saved.customPack?.id === saved.packId)
  ? saved.packId : 'permission';
let customPack: Pack | null = saved?.customPack ?? null;
let pack: Pack | null = customPack && customPack.id === packId ? customPack : null;
let progress: Progress = saved?.progress ?? newProgress(packHash({ id: packId }));
let skill = '';
let hintLevel = 0;
let answered = false;
let view = 'home';
let pendingRestore = '';

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const main = $('#main');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const lang = () => settings.lang;
const plain = () => settings.plain;
const T = (key: StrKey, vars?: Record<string, string | number>) => t(key, lang(), plain(), vars);
const tx = (text: LText) => pickText(text, lang(), plain());
const bitsCount = bitCount;

function persist() {
  save(settings, packId, progress, customPack);
  void updateStorageBadge();
}

function txHTML(text: LText): string {
  const used: Lang = (lang() === 'es' && text.es) ? 'es' : 'en';
  const loc = used === 'es' ? text.es! : text.en;
  const s = esc(plain() ? loc.plain : loc.std);
  return used === lang() ? s : `<span lang="${used}">${s}</span>`;
}

function enAttr(s: string): string {
  return lang() === 'en' ? esc(s) : `<span lang="en">${esc(s)}</span>`;
}

const packCache: Partial<Record<BuiltinId, Pack>> = {};
async function loadBuiltin(id: BuiltinId): Promise<Pack> {
  if (!packCache[id]) packCache[id] = await catalogEntry(id)!.load();
  return packCache[id]!;
}
async function ensurePack(id = packId): Promise<Pack> {
  if (customPack && customPack.id === id) { pack = customPack; packId = id; return pack; }
  const entry = catalogEntry(id);
  if (!entry) throw new Error('unknown pack');
  pack = await loadBuiltin(entry.id);
  packId = pack.id;
  return pack;
}
function currentHash(): number {
  if (customPack && customPack.id === packId) return packHash(customPack);
  return packHash({ id: packId });
}
function skillIndex(p: Pack, id: string) {
  const i = p.skills.findIndex((s) => s.id === id);
  return i < 0 ? 0 : Math.min(2, i);
}

// ---------- chrome / settings ----------
function applySettings() {
  const root = document.documentElement;
  root.lang = settings.lang;
  root.classList.toggle('lt1', settings.largeText === 1);
  root.classList.toggle('lt2', settings.largeText === 2);
  root.classList.toggle('hc', settings.contrast);
  const sizeName = [T('sizeNormal'), T('sizeLarge'), T('sizeXL')][settings.largeText];
  $('#t-size').textContent = `${T('textSize')}: ${sizeName}`;
  $('#t-contrast').textContent = T('contrast');
  $('#t-contrast').setAttribute('aria-pressed', String(settings.contrast));
  $('#t-plain').textContent = T('plain');
  $('#t-plain').setAttribute('aria-pressed', String(settings.plain));
  const langBtn = $('#t-lang');
  langBtn.textContent = T('langBtn');
  langBtn.lang = settings.lang;
  langBtn.setAttribute('aria-label', T('langSwitchTo'));
  $('.skip').textContent = T('skip');
  $('.toolbar').setAttribute('aria-label', settings.lang === 'es'
    ? 'Opciones de pantalla, idioma y lectura' : 'Display, language and reading options');
  $('#f-code').textContent = T('resumeCode');
  $('#f-end').textContent = T('endSession');
  $('#f-builder').textContent = T('builderLink');
  $('#f-about').textContent = T('about');
  $('#mode-status').textContent = settings.saveOnDevice ? T('savingOn') : T('noTrace');
  const sw = $('#sw-status');
  if (sw.textContent) {
    const fails = [t('swFail', 'en', false), t('swFail', 'es', false)];
    sw.textContent = fails.includes(sw.textContent) ? T('swFail') : T('swReady');
  }
  void updateStorageBadge();
}

// ---------- speech ----------
const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
function speak(text: string) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(
    text.replace(/(\d+)\/(\d+)/g, (_, n, d) => `${n} ${T('overWord')} ${d}`).replace(/−/g, ` ${T('minusWord')} `).replace(/×/g, ' × '),
  );
  u.rate = 0.9;
  u.lang = settings.lang === 'es' ? 'es' : 'en';
  speechSynthesis.speak(u);
}
const speakBtn = (text: string, label?: string) =>
  canSpeak ? `<button type="button" class="secondary speak" data-speak="${esc(text)}"><span aria-hidden="true">🔊</span> ${label ?? T('readAloud')}</button>` : '';

// ---------- views ----------
function show(name: string, html: string, focus = true) {
  view = name;
  if (canSpeak) speechSynthesis.cancel();
  main.innerHTML = html;
  const h = $('h1, h2', main);
  if (h) { h.tabIndex = -1; if (focus) h.focus(); }
  document.title = `${h?.textContent ?? T('appName')} · ${T('appName')}`;
}

function contentLangNote(p: Pack): string {
  if (settings.lang !== 'es') return '';
  if (isGenerated(p.practice)) return '';
  const sample = p.pre[0]?.prompt ?? p.intro?.title ?? p.title;
  if (sample && !hasLocale(sample, 'es')) {
    return `<p class="hint-text" role="note" lang="en">${esc(T('contentInEn'))}</p>`;
  }
  return '';
}

function home(focus = true) {
  const h = currentHash();
  const started = progress.packHash === h && (progress.preCount > 0 || progress.stage > 0);
  const packLabel = (c: { id: string; title: LText | string; desc?: LText | string; description?: LText }) => {
    const title = typeof c.title === 'string' ? esc(c.title) : txHTML(c.title);
    const descSrc = 'desc' in c && c.desc != null ? c.desc : (c as { description?: LText }).description;
    const desc = descSrc == null ? '' : typeof descSrc === 'string' ? esc(descSrc) : txHTML(descSrc);
    return `<label class="pack"><input type="radio" name="pack" value="${esc(c.id)}" ${c.id === packId ? 'checked' : ''}>
        <span><span class="pack-title">${title}</span><span class="pack-desc">${desc}</span></span></label>`;
  };
  const curriculum = CATALOG.filter((c) => c.group === 'curriculum');
  const demo = CATALOG.filter((c) => c.group === 'demo');
  show('home', `
    <h1>${esc(T('homeTitle'))}</h1>
    <p>${esc(T('homeLead'))}</p>
    <ol class="plan"><li>${esc(T('plan1'))}</li></ol>
    <fieldset class="packs pack-group">
      <legend>${esc(T('curriculumLegend'))}</legend>
      ${curriculum.map(packLabel).join('')}
    </fieldset>
    <fieldset class="packs pack-group">
      <legend>${esc(T('demoLegend'))}</legend>
      ${demo.map(packLabel).join('')}
    </fieldset>
    ${customPack ? `<fieldset class="packs pack-group"><legend>${esc(T('customPack'))}</legend>${packLabel({ id: customPack.id, title: customPack.title, description: customPack.description })}</fieldset>` : ''}
    ${customPack ? `<p class="hint-text">${esc(T('packLoaded'))}: ${esc(tx(customPack.title))}</p>` : ''}
    <div class="row">
      <button type="button" data-go="${started ? 'continue' : 'start'}">${started ? esc(T('continue')) : esc(T('start'))}</button>
      <button type="button" class="secondary" data-go="restore">${esc(T('haveCode'))}</button>
    </div>
    <div class="row">
      <label class="check" for="pack-file">${esc(T('importPack'))}</label>
      <input id="pack-file" type="file" accept="application/json,.json">
      <button type="button" class="link" data-go="builder">${esc(T('builderLink'))}</button>
    </div>
    <p id="import-err" role="alert"></p>
    <section aria-labelledby="privacy-h" class="card">
      <h2 id="privacy-h">${esc(T('privacyH'))}</h2>
      <label class="check"><input type="checkbox" id="save-device" ${settings.saveOnDevice ? 'checked' : ''}>
        ${esc(T('saveDevice'))}</label>
      <p class="hint-text">${esc(T('saveHint'))}</p>
      <p class="hint-text">${esc(T('wipeEscHelp'))}</p>
    </section>`, focus);
  $('#save-device', main).addEventListener('change', (e) => {
    settings.saveOnDevice = (e.target as HTMLInputElement).checked; persist(); applySettings();
  });
  main.querySelectorAll('input[name=pack]').forEach((el) => {
    el.addEventListener('change', () => {
      packId = (el as HTMLInputElement).value;
      pack = (customPack && customPack.id === packId) ? customPack : null;
      persist();
      home(false);
    });
  });
  $('#pack-file', main).addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const r = validatePack(raw);
      if (!r.ok) {
        $('#import-err', main).textContent = r.errors.map((er) => `${er.path}: ${er.message}`).join(' ');
        return;
      }
      customPack = r.pack; packId = r.pack.id; pack = r.pack; persist(); home();
    } catch {
      $('#import-err', main).textContent = T('importErr');
    }
  });
}

async function withPack(fn: (p: Pack) => void | Promise<void>) {
  try {
    show(view, `<h1>${esc(T('packingWait'))}</h1>`, false);
    const p = await ensurePack();
    await fn(p);
  } catch {
    show('error', `<h1>${esc(T('packFail'))}</h1><div class="row"><button type="button" data-go="home">${esc(T('back'))}</button></div>`);
  }
}

function cont() {
  void withPack((p) => {
    if (progress.stage === 0) return progress.preCount >= p.checkLength ? preDone(p) : check(p, 'pre');
    if (progress.stage === 1) return practice(p);
    if (progress.stage === 2) return progress.postCount >= p.checkLength ? results(p) : check(p, 'post');
    return results(p);
  });
}

// ---------- fractions rendering (lazy module) ----------
type FracMod = typeof import('./fractions');
let fracMod: FracMod | null = null;
async function fractions(): Promise<FracMod> {
  if (!fracMod) fracMod = await import('./fractions');
  return fracMod;
}

function fracHTML(f: { n: number | '?'; d: number | '?' }): string {
  const sayPart = (v: number | '?') => (v === '?' ? T('blankWord') : String(v));
  return `<span class="frac"><span class="sr-only">${sayPart(f.n)} ${T('overWord')} ${sayPart(f.d)}</span>` +
    `<span class="fv" aria-hidden="true"><span class="num${f.n === '?' ? ' q' : ''}">${f.n}</span><span class="den${f.d === '?' ? ' q' : ''}">${f.d}</span></span></span>`;
}
function mathText(s: string): string {
  return esc(s).replace(/(\d+)\/(\d+)/g, (_, n, d) => fracHTML({ n: +n, d: +d }));
}
function problemHTML(p: FracMod['generate'] extends (...a: never) => infer R ? R : never): string {
  const sym: Record<string, string> = { '+': T('plusWord'), '−': T('minusWord'), '=': T('equalsWord') };
  return `<p class="math">` + p.parts.map((x) => {
    if (typeof x === 'string') return `<span class="op"><span aria-hidden="true">${esc(x)}</span><span class="sr-only">${sym[x] ?? x}</span></span>`;
    if ('blank' in x) return `<span class="blank"><span aria-hidden="true">?</span><span class="sr-only">${esc(T('blankWord'))}</span></span>`;
    return fracHTML(x);
  }).join('') + `</p>`;
}
function barsHTML(p: { bars?: { n: number; d: number }[] }): string {
  if (!p.bars) return '';
  return `<div class="bars">` + p.bars.map((f) => {
    const w = 240, h = 28, cw = w / f.d;
    let cells = '';
    for (let i = 0; i < f.d; i++) cells += `<rect x="${i * cw}" y="0" width="${cw}" height="${h}" class="${i < f.n ? 'on' : 'off'}"/>`;
    return `<svg viewBox="-1 -1 ${w + 2} ${h + 2}" width="${w}" height="${h}" role="img" aria-label="${esc(T('barLabel', { d: f.d, n: f.n }))}" focusable="false">${cells}</svg>`;
  }).join('') + `</div>`;
}

function answerFormFrac(kind: 'int' | 'frac' | 'cmp', submitLabel: string): string {
  let inputs = '';
  if (kind === 'int') {
    inputs = `<label for="a-int">${esc(T('missingNumber'))}</label>
      <input id="a-int" name="int" inputmode="numeric" autocomplete="off" required>`;
  } else if (kind === 'frac') {
    inputs = `<fieldset><legend>${esc(T('yourFrac'))}</legend>
      <div class="frac-in">
        <label for="a-n">${esc(T('numerator'))}</label><input id="a-n" name="n" inputmode="numeric" autocomplete="off" required>
        <label for="a-d">${esc(T('denominator'))}</label><input id="a-d" name="d" inputmode="numeric" autocomplete="off" required>
      </div></fieldset>`;
  } else {
    inputs = `<fieldset class="cmp"><legend>${esc(T('chooseSymbol'))}</legend>
      ${(['<', '>', '='] as const).map((s, i) => `<label class="radio"><input type="radio" name="cmp" value="${s}" ${i === 0 ? 'required' : ''}>
        <span class="sym" aria-hidden="true">${esc(s)}</span> ${{ '<': T('isLess'), '>': T('isGreater'), '=': T('isEqual') }[s]}</label>`).join('')}
      </fieldset>`;
  }
  return `<form id="answer" novalidate>${inputs}<div class="row"><button type="submit">${esc(submitLabel)}</button></div>
    <div id="feedback" role="status" aria-live="polite"></div></form>`;
}

function choiceForm(item: Item, submitLabel: string): string {
  const choices = (item.choices ?? []).map((c, i) =>
    `<label class="radio"><input type="radio" name="choice" value="${esc(c.id)}" ${i === 0 ? 'required' : ''}> ${esc(tx(c.text))}</label>`).join('');
  return `<form id="answer" novalidate><fieldset><legend>${esc(tx(item.prompt))}</legend>${choices}</fieldset>
    <div class="row"><button type="submit">${esc(submitLabel)}</button></div>
    <div id="feedback" role="status" aria-live="polite"></div></form>`;
}

function roleName(r: RoleId): string {
  return T(({ you: 'roleYou', group: 'roleGroup', class: 'roleClass', teacher: 'roleTeacher', public: 'rolePublic' } as const)[r]);
}
function accessForm(item: Item, submitLabel: string): string {
  const a = item.access!;
  const groups = a.roles.map((r) => `<fieldset>
    <legend>${esc(roleName(r))}</legend>
    ${(['none', 'view', 'edit'] as const).map((lv, i) => `<label class="radio"><input type="radio" name="${esc(r)}" value="${lv}" ${i === 0 ? 'required' : ''}> ${esc(T(({ none: 'accessNone', view: 'accessView', edit: 'accessEdit' } as const)[lv]))}</label>`).join('')}
  </fieldset>`).join('');
  return `<form id="answer" novalidate>
    <p class="prompt">${esc(tx(item.prompt))}</p>
    <article class="card">
      <h2>${esc(tx(a.name))}</h2>
      <p class="badge" role="note">${esc(T('fictional'))}</p>
      <p>${esc(tx(a.summary))}</p>
    </article>
    <div class="access"><p class="prompt" id="access-h">${esc(T('accessFor'))}</p>${groups}</div>
    <div class="row"><button type="submit">${esc(submitLabel)}</button></div>
    <div id="feedback" role="status" aria-live="polite"></div>
  </form>`;
}

function messageBlock(item: Item): string {
  const m = item.message!;
  return `<article class="mail" aria-label="${esc(T('fictional'))}">
    <p class="badge" role="note">${esc(T('fictional'))}</p>
    <p class="mail-meta"><strong>${esc(T('fromLabel'))}:</strong> <span lang="en">${esc(m.from)}</span></p>
    <p class="mail-meta"><strong>${esc(T('subjectLabel'))}:</strong> ${esc(tx(m.subject))}</p>
    <p class="mail-body">${esc(tx(m.body))}</p>
  </article>`;
}

function explanationHTML(item: Item): string {
  let html = '';
  if (item.explanation) html += `<section class="card" aria-labelledby="exp-h"><h2 id="exp-h">${esc(T('explanationH'))}</h2><p>${esc(tx(item.explanation))}</p></section>`;
  if (item.flags?.length) html += `<section class="card" aria-labelledby="flags-h"><h2 id="flags-h">${esc(T('flagsH'))}</h2><ul class="flags">${item.flags.map((f) => `<li>${esc(tx(f))}</li>`).join('')}</ul></section>`;
  return html;
}

async function check(p: Pack, kind: 'pre' | 'post') {
  const i = kind === 'pre' ? progress.preCount : progress.postCount;
  const title = kind === 'pre' ? T('preTitle') : T('postTitle');
  const len = p.checkLength;
  if (isGenerated(p.practice)) {
    const F = await fractions();
    const problem = F.checkProblem(progress.seed, i, kind);
    show(kind, `
      <h1>${esc(title)}: ${esc(T('questionOf'))} ${i + 1} ${esc(T('ofWord'))} ${len}</h1>
      ${contentLangNote(p)}
      <progress max="${len}" value="${i}" aria-label="${esc(title)}">${i} of ${len}</progress>
      <p class="hint-text">${esc(T('noHintsHere'))}</p>
      <p class="prompt">${esc(F.pickBi(problem.prompt, lang(), plain()))}.</p>
      ${problemHTML(problem)}
      ${speakBtn(`${F.pickBi(problem.prompt, lang(), plain())}. ${F.pickSpeech(problem, lang())}.`)}
      ${answerFormFrac(problem.answer.kind, T('submit'))}`);
    bindFracCheck(p, kind, problem, F);
    return;
  }
  const item = (kind === 'pre' ? p.pre : p.post)[i];
  const body = item.kind === 'message' ? messageBlock(item) : '';
  const spoken = [tx(item.prompt), item.message ? `${T('fromLabel')}: ${item.message.from}. ${tx(item.message.subject)}. ${tx(item.message.body)}` : ''].filter(Boolean).join(' ');
  show(kind, `
    <h1>${esc(title)}: ${esc(T('questionOf'))} ${i + 1} ${esc(T('ofWord'))} ${len}</h1>
    ${contentLangNote(p)}
    <progress max="${len}" value="${i}" aria-label="${esc(title)}">${i} of ${len}</progress>
    <p class="hint-text">${esc(T('noHintsHere'))}</p>
    ${item.kind === 'message' ? '' : `<p class="prompt">${esc(tx(item.prompt))}</p>`}
    ${body}
    ${speakBtn(spoken)}
    ${choiceForm(item, T('submit'))}`);
  bindChoiceCheck(p, kind, item);
}

function recordCheck(kind: 'pre' | 'post', p: Pack, correct: boolean) {
  const i = kind === 'pre' ? progress.preCount : progress.postCount;
  if (kind === 'pre') { if (correct) progress.preMask |= 1 << i; progress.preCount++; }
  else { if (correct) progress.postMask |= 1 << i; progress.postCount++; }
  if (kind === 'post' && progress.postCount >= p.checkLength) progress.stage = 3;
  persist();
  const done = (kind === 'pre' ? progress.preCount : progress.postCount) >= p.checkLength;
  if (done) kind === 'pre' ? preDone(p) : results(p); else void check(p, kind);
}

function bindChoiceCheck(p: Pack, kind: 'pre' | 'post', item: Item) {
  const form = $<HTMLFormElement>('#answer', main);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const choice = new FormData(form).get('choice') as string;
    const g = gradeItem(item, { choice });
    if (g.invalid) { $('#feedback', main).innerHTML = `<p class="warn">${esc(T('pickChoice'))}</p>`; return; }
    recordCheck(kind, p, g.correct);
  });
}

function bindFracCheck(p: Pack, kind: 'pre' | 'post', problem: Awaited<ReturnType<FracMod['checkProblem']>>, F: FracMod) {
  const form = $<HTMLFormElement>('#answer', main);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const g = F.grade(problem, { int: fd.get('int') as string, n: fd.get('n') as string, d: fd.get('d') as string, cmp: fd.get('cmp') as string });
    if (g.invalid) { $('#feedback', main).innerHTML = `<p class="warn">${esc(localizeInvalid(g.invalid))}</p>`; return; }
    recordCheck(kind, p, g.correct);
  });
}

function localizeInvalid(msg: string): string {
  if (/whole number\.$/.test(msg) && !/top/.test(msg)) return T('enterWhole');
  if (/Choose/.test(msg)) return T('chooseCmp');
  if (/cannot be 0/.test(msg)) return T('denZero');
  if (/top and the bottom/.test(msg)) return T('enterFrac');
  return msg;
}

function introHTML(p: Pack): string {
  if (!p.intro) return '';
  const mock = p.intro.mock ? `<div class="mock">
    <div class="mock-bar"><span class="mock-dots" aria-hidden="true">●●●</span><span>${esc(p.intro.mock.url)}</span></div>
    <p class="mock-status" lang="en">${esc(p.intro.mock.status)}</p>
    <p class="mock-msg">${esc(tx(p.intro.mock.message))}</p>
  </div>` : '';
  return `<section aria-labelledby="intro-h">
    <h2 id="intro-h">${esc(tx(p.intro.title))}</h2>
    ${mock}
    ${p.intro.body.map((b) => `<p>${esc(tx(b))}</p>`).join('')}
  </section>`;
}

function preDone(p: Pack) {
  const score = bitsCount(progress.preMask);
  const spokenIntro = p.intro ? [tx(p.intro.title), ...p.intro.body.map(tx)].join(' ') : '';
  show('predone', `
    <h1>${esc(T('preDone'))}</h1>
    <p class="big">${esc(T('youGot'))} <strong>${score} ${esc(T('ofWord'))} ${p.checkLength}</strong>.</p>
    <p>${esc(T('preDoneBody'))}</p>
    ${introHTML(p)}
    ${p.intro ? speakBtn(spokenIntro, T('readAloud')) : ''}
    ${p.credit ? `<p class="hint-text">${esc(tx(p.credit))}</p>` : ''}
    <div class="row"><button type="button" data-go="begin-practice">${esc(p.intro ? T('continueLesson') : T('startPractice'))}</button></div>`);
}

function practiceReady(p: Pack): boolean {
  if (isGenerated(p.practice)) return progress.skills.every((s) => s.correct >= p.stageTarget);
  if (p.skills.length > 1) return p.skills.every((_, i) => progress.skills[i].correct >= p.stageTarget);
  return progress.skills[0].correct >= Math.min(p.stageTarget, practiceItems(p).length || p.stageTarget);
}

function currentPracticeItem(p: Pack): Item | null {
  const items = practiceItems(p);
  if (!items.length) return null;
  if (p.skills.length > 1) return items.find((it) => it.skill === skill) ?? items[skillIndex(p, skill)] ?? items[0];
  const idx = Math.min(progress.skills[0].attempts, items.length - 1);
  return items[idx];
}

async function practice(p: Pack) {
  if (!skill) skill = p.skills[0]?.id ?? '';
  if (isGenerated(p.practice)) return fracPractice(p);
  const item = currentPracticeItem(p)!;
  hintLevel = 0; answered = false;
  const ready = practiceReady(p);
  const nextLabel = item.kind === 'access' ? T('nextFile') : item.kind === 'message' ? T('nextMessage') : T('nextProblem');
  const spoken = item.kind === 'message'
    ? `${tx(item.prompt)}. ${T('fromLabel')}: ${item.message!.from}. ${tx(item.message!.subject)}. ${tx(item.message!.body)}`
    : item.kind === 'access'
      ? `${tx(item.prompt)}. ${tx(item.access!.name)}. ${tx(item.access!.summary)}`
      : tx(item.prompt);
  const form = item.kind === 'access' ? accessForm(item, T('checkAns')) : choiceForm(item, T('checkAns'));
  show('practice', `
    <h1>${esc(T('practice'))}: ${esc(tx(p.skills[skillIndex(p, item.skill)]?.name ?? p.title))}</h1>
    ${contentLangNote(p)}
    ${skillNav(p)}
    ${item.kind === 'message' ? messageBlock(item) : ''}
    <div class="row">${speakBtn(spoken)}</div>
    ${form}
    <div class="row">
      ${item.hints?.length ? `<button type="button" class="secondary" id="hint-btn">${esc(T('showHint'))} (1 ${esc(T('ofWord'))} ${item.hints.length})</button>` : ''}
      ${item.steps?.length ? `<button type="button" class="secondary" id="steps-btn">${esc(T('showSteps'))}</button>` : ''}
      <button type="button" class="secondary" id="next-btn">${esc(nextLabel)}</button>
    </div>
    <section id="help" aria-live="polite"></section>
    ${readySection(p, ready)}`);
  bindPractice(p, item);
}

function skillNav(p: Pack): string {
  if (p.skills.length < 2) return '';
  return `<nav aria-label="${esc(T('chooseSkill'))}" class="skills">
    ${p.skills.map((s, k) => `<button type="button" class="secondary" data-skill="${esc(s.id)}" aria-pressed="${s.id === skill}">
      ${esc(tx(s.name))} <span class="count">(${progress.skills[k].correct} ${esc(T('correctWord'))})</span></button>`).join('')}
  </nav>`;
}
function readySection(p: Pack, ready: boolean): string {
  return `<section class="card" aria-labelledby="next-h">
    <h2 id="next-h">${esc(T('whenReady'))}</h2>
    <p>${ready ? esc(T('readyPost')) : esc(T('tipPost'))}</p>
    <div class="row"><button type="button" class="${ready ? '' : 'secondary'}" data-go="post">${esc(T('takePost'))}</button>
    <button type="button" class="secondary" data-go="code">${esc(T('getCode'))}</button></div>
  </section>`;
}

function bindPractice(p: Pack, item: Item) {
  const help = $('#help', main);
  const hintBtn = $('#hint-btn', main) as HTMLButtonElement | null;
  if (hintBtn && item.hints) {
    hintBtn.addEventListener('click', () => {
      if (hintLevel >= item.hints!.length) return;
      hintLevel++;
      progress.hints = Math.min(31, progress.hints + 1); persist();
      help.innerHTML = `<h2>${esc(T('hintsH'))}</h2><ol class="hints">${item.hints!.slice(0, hintLevel).map((h) => `<li>${esc(tx(h))}</li>`).join('')}</ol>` +
        speakBtn(tx(item.hints![hintLevel - 1]), T('readHint'));
      if (hintLevel >= item.hints!.length) { hintBtn.disabled = true; hintBtn.textContent = T('noMoreHints'); }
      else hintBtn.textContent = `${T('showHint')} (${hintLevel + 1} ${T('ofWord')} ${item.hints!.length})`;
    });
  }
  const stepsBtn = $('#steps-btn', main);
  if (stepsBtn) stepsBtn.addEventListener('click', () => showItemSteps(p, item));
  $('#next-btn', main).addEventListener('click', () => {
    if (!answered) advancePractice(p, false);
    else advancePractice(p, true, true);
  });
  const form = $<HTMLFormElement>('#answer', main);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (answered) return;
    const fb = $('#feedback', main);
    const g = gradeItem(item, readItemForm(form, item));
    if (g.invalid === 'choice') { fb.innerHTML = `<p class="warn">${esc(T('pickChoice'))}</p>`; return; }
    if (g.invalid === 'roles') { fb.innerHTML = `<p class="warn">${esc(T('setAllRoles'))}</p>`; return; }
    if (g.correct) {
      markCorrect(p, item, fb);
    } else {
      const note = g.accessNote === 'too-open' ? T('tooOpen') : g.accessNote === 'too-tight' ? T('tooTight') : T('notQuite');
      fb.innerHTML = `<p class="warn">${esc(note)}</p>`;
    }
  });
}

function readItemForm(form: HTMLFormElement, item: Item): { choice?: string; access?: Partial<Record<RoleId, AccessLevel>> } {
  const fd = new FormData(form);
  if (item.kind === 'access' && item.access) {
    const access: Partial<Record<RoleId, AccessLevel>> = {};
    for (const r of item.access.roles) access[r] = (fd.get(r) as AccessLevel) || undefined;
    return { access };
  }
  return { choice: (fd.get('choice') as string) || undefined };
}

function markCorrect(p: Pack, item: Item, fb: HTMLElement) {
  answered = true;
  const si = p.skills.length > 1 ? skillIndex(p, item.skill) : 0;
  const sp = progress.skills[si];
  sp.attempts = Math.min(31, sp.attempts + 1);
  sp.correct = Math.min(15, sp.correct + 1);
  persist();
  fb.innerHTML = `<p class="ok"><span aria-hidden="true">✓</span> ${esc(T('yesCorrect'))}</p>` + explanationHTML(item);
  $<HTMLFormElement>('#answer', main).querySelectorAll('input,button[type=submit]').forEach((el) => ((el as HTMLInputElement).disabled = true));
  const cnt = $(`[data-skill="${item.skill}"] .count`, main); if (cnt) cnt.textContent = `(${sp.correct} ${T('correctWord')})`;
  $<HTMLButtonElement>('#next-btn', main).focus();
}

function showItemSteps(p: Pack, item: Item) {
  const help = $('#help', main);
  help.innerHTML = `<h2>${esc(T('stepsH'))}</h2>` +
    (item.steps?.length ? `<ol class="steps">${item.steps.map((s) => `<li>${esc(tx(s))}</li>`).join('')}</ol>` : '') +
    explanationHTML(item) +
    (item.steps?.length ? speakBtn(item.steps.map(tx).join(' '), T('readSteps')) : '');
  if (!answered) {
    answered = true;
    const si = p.skills.length > 1 ? skillIndex(p, item.skill) : 0;
    progress.skills[si].attempts = Math.min(31, progress.skills[si].attempts + 1); persist();
    $<HTMLFormElement>('#answer', main).querySelectorAll('input,button[type=submit]').forEach((el) => ((el as HTMLInputElement).disabled = true));
  }
  $<HTMLButtonElement>('#next-btn', main).focus();
}

function advancePractice(p: Pack, _wasAnswered: boolean, alreadyCounted = false) {
  if (p.skills.length > 1) {
    const i = skillIndex(p, skill);
    const next = p.skills[(i + 1) % p.skills.length];
    skill = next.id;
  } else if (!alreadyCounted && !answered) {
    progress.skills[0].attempts = Math.min(31, progress.skills[0].attempts + 1);
    persist();
  }
  void practice(p);
}

async function fracPractice(p: Pack) {
  const F = await fractions();
  const skills = F.SKILLS;
  if (!skills.includes(skill as (typeof skills)[number])) skill = skills[0];
  const si = skills.indexOf(skill as (typeof skills)[number]);
  const sp = progress.skills[si];
  const problem = F.generate(skill as (typeof skills)[number], progress.seed, sp.attempts, 'practice');
  hintLevel = 0; answered = false;
  const ready = practiceReady(p);
  const name = tx(p.skills[si].name);
  const prompt = F.pickBi(problem.prompt, lang(), plain());
  const spoken = F.pickSpeech(problem, lang());
  show('practice', `
    <h1>${esc(T('practice'))}: ${esc(name)}</h1>
    ${contentLangNote(p)}
    ${skillNav(p)}
    <p class="prompt">${esc(prompt)}.</p>
    ${problemHTML(problem)}
    <div class="row">${speakBtn(`${prompt}. ${spoken}.`)}</div>
    ${answerFormFrac(problem.answer.kind, T('checkAns'))}
    <div class="row">
      <button type="button" class="secondary" id="hint-btn">${esc(T('showHint'))} (1 ${esc(T('ofWord'))} ${problem.hints.length})</button>
      <button type="button" class="secondary" id="steps-btn">${esc(T('showSteps'))}</button>
      <button type="button" class="secondary" id="next-btn">${esc(T('nextProblem'))}</button>
    </div>
    <section id="help" aria-live="polite"></section>
    ${readySection(p, ready)}`);
  const help = $('#help', main);
  const hintBtn = $<HTMLButtonElement>('#hint-btn', main);
  hintBtn.addEventListener('click', () => {
    if (hintLevel >= problem.hints.length) return;
    hintLevel++;
    progress.hints = Math.min(31, progress.hints + 1); persist();
    const ht = problem.hints.slice(0, hintLevel).map((h) => F.pickBi(h, lang(), plain()));
    help.innerHTML = `<h2>${esc(T('hintsH'))}</h2>` + barsHTML(problem) +
      `<ol class="hints">${ht.map((h) => `<li>${mathText(h)}</li>`).join('')}</ol>` +
      speakBtn(ht[hintLevel - 1], T('readHint'));
    if (hintLevel >= problem.hints.length) { hintBtn.disabled = true; hintBtn.textContent = T('noMoreHints'); }
    else hintBtn.textContent = `${T('showHint')} (${hintLevel + 1} ${T('ofWord')} ${problem.hints.length})`;
  });
  $('#steps-btn', main).addEventListener('click', () => {
    const steps = problem.steps.map((s) => F.pickBi(s, lang(), plain()));
    help.innerHTML = `<h2>${esc(T('stepsH'))}</h2>${barsHTML(problem)}
      <ol class="steps">${steps.map((s) => `<li>${mathText(s)}</li>`).join('')}</ol>
      <p>${esc(T('answerWord'))}: <strong>${mathText(F.answerText(problem.answer))}</strong></p>
      ${speakBtn(steps.join(' '), T('readSteps'))}`;
    if (!answered) {
      answered = true;
      sp.attempts = Math.min(31, sp.attempts + 1); persist();
      $<HTMLFormElement>('#answer', main).querySelectorAll('input,button[type=submit]').forEach((el) => ((el as HTMLInputElement).disabled = true));
    }
    $<HTMLButtonElement>('#next-btn', main).focus();
  });
  $('#next-btn', main).addEventListener('click', () => {
    if (!answered) { progress.skills[si].attempts = Math.min(31, sp.attempts + 1); persist(); }
    void practice(p);
  });
  const form = $<HTMLFormElement>('#answer', main);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fb = $('#feedback', main);
    if (answered) return;
    const fd = new FormData(form);
    const g = F.grade(problem, { int: fd.get('int') as string, n: fd.get('n') as string, d: fd.get('d') as string, cmp: fd.get('cmp') as string });
    if (g.invalid) { fb.innerHTML = `<p class="warn">${esc(localizeInvalid(g.invalid))}</p>`; return; }
    if (g.correct) {
      answered = true;
      sp.attempts = Math.min(31, sp.attempts + 1);
      sp.correct = Math.min(15, sp.correct + 1);
      persist();
      const note = g.simplestNote
        ? ` ${mathText(`${T('simplest')} ${F.answerText({ kind: 'frac', value: g.simplestNote })}.`)}`
        : '';
      fb.innerHTML = `<p class="ok"><span aria-hidden="true">✓</span> ${esc(T('yesCorrect'))}${note}</p>`;
      form.querySelectorAll('input,button[type=submit]').forEach((el) => ((el as HTMLInputElement).disabled = true));
      const cnt = $(`[data-skill="${skill}"] .count`, main); if (cnt) cnt.textContent = `(${sp.correct} ${T('correctWord')})`;
      $<HTMLButtonElement>('#next-btn', main).focus();
    } else {
      fb.innerHTML = `<p class="warn">${esc(T('notQuite'))}</p>`;
    }
  });
}

function results(p: Pack) {
  const pre = bitsCount(progress.preMask), post = bitsCount(progress.postMask);
  const len = p.checkLength;
  const per = (mask: number, k: number) => {
    // Fractions: item 0 is equiv, item 1 is addsub. Compare is practice-only.
    if (isGenerated(p.practice)) return k <= 1 ? bitsCount(mask & (1 << k)) : null;
    return null;
  };
  const diff = post - pre;
  const rows = p.skills.map((s, k) => {
    const preS = per(progress.preMask, k);
    const postS = per(progress.postMask, k);
    return `<tr><th scope="row">${esc(tx(s.name))}</th>${preS === null ? '' : `<td>${preS}/2</td><td>${progress.stage === 3 ? `${postS}/2` : '—'}</td>`}<td>${progress.skills[k].correct}</td></tr>`;
  }).join('');
  const skillHead = isGenerated(p.practice)
    ? `<th scope="col">${esc(T('preTitle'))}</th><th scope="col">${esc(T('postTitle'))}</th>` : '';
  const code = encode(progress);
  const delta = diff > 0 ? ` <span class="ok">(+${diff})</span>` : diff < 0 ? ` (${diff})` : '';
  show('results', `
    <h1>${esc(T('results'))}</h1>
    <section class="mastery" aria-labelledby="mastery-h">
      <h2 id="mastery-h">${esc(T('masteryTitle'))}</h2>
      <p class="big">${esc(T('before'))}: <strong>${pre}/${len}</strong> → ${esc(T('after'))}: <strong>${post}/${len}</strong>${delta}</p>
      <p>${esc(T('masteryNote'))}</p>
      <p>${esc(T('completionCode'))}: <span class="code small" id="completion-code">${code}</span></p>
    </section>
    <table>
      <caption>${esc(T('bySkill'))}${isGenerated(p.practice) ? ' (2 / 2)' : ''}</caption>
      <thead><tr><th scope="col">${esc(T('skillH'))}</th>${skillHead}<th scope="col">${esc(T('practiceCorrect'))}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>${esc(T('hintsOpened'))}: ${progress.hints}</p>
    <div class="row">
      <button type="button" data-go="practice">${esc(T('keepPractising'))}</button>
      <button type="button" class="secondary" data-go="code">${esc(T('getCode'))}</button>
      <button type="button" class="secondary" data-go="restart">${esc(T('startOver'))}</button>
    </div>`);
}

function codeView() {
  const code = encode(progress);
  const url = `${location.origin}${location.pathname}#r=${code.replace(/-/g, '')}`;
  show('code', `
    <h1>${esc(T('codeTitle'))}</h1>
    <p>${esc(T('codeHelp'))}</p>
    <p class="code" id="the-code" aria-label="${esc(T('resumeAria'))} ${code.replace(/-/g, '').split('').join(' ')}">${code}</p>
    <div class="row">
      <button type="button" class="secondary" id="copy">${esc(T('copyCode'))}</button>
      ${speakBtn(`${T('yourCodeIs')} ${code.replace(/-/g, '').split('').join(', ')}`, T('spellCode'))}
    </div>
    <figure class="qr"><div id="qr-slot" class="qr-slot"></div><figcaption>${esc(T('scanCaption'))}</figcaption></figure>
    <details class="card"><summary>${esc(T('whatsInCode'))}</summary>
      <p>${esc(T('codePrivacy'))}</p>
      <p>${esc(T('codeHonest'))}</p>
    </details>
    <div class="row"><button type="button" data-go="continue">${esc(T('backToPractice'))}</button></div>`);
  import('./qr').then(({ qrSvg }) => {
    const slot = $('#qr-slot', main);
    if (slot) slot.innerHTML = qrSvg(url, T('qrLabel'));
  });
  $('#copy', main).addEventListener('click', async () => {
    const btn = $('#copy', main);
    try { await navigator.clipboard.writeText(code); btn.textContent = T('copied'); }
    catch { btn.textContent = T('copyFail'); }
  });
}

function decodeError(code: string): string {
  if (code.startsWith('len:')) return T('codeErrLen', { n: code.slice(4) });
  if (code.startsWith('char:')) return T('codeErrChar', { ch: code.slice(5) });
  if (code === 'typo') return T('codeErrTypo');
  if (code === 'version') return T('codeErrVersion');
  if (code === 'impossible') return T('codeErrImpossible');
  if (code === 'pack') return T('codeErrPack');
  return T('codeErrTypo');
}

async function resolvePackForHash(h: number): Promise<Pack | null> {
  if (customPack && packHash(customPack) === h) return customPack;
  for (const c of CATALOG) {
    const p = await loadBuiltin(c.id);
    if (packHash(p) === h) return p;
  }
  return null;
}

function restoreView(prefill = '') {
  show('restore', `
    <h1>${esc(T('restoreTitle'))}</h1>
    <form id="restore" novalidate>
      <label for="code-in">${esc(T('codeLabel'))}</label>
      <input id="code-in" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(prefill)}" aria-describedby="code-help code-err">
      <p id="code-help" class="hint-text">${esc(T('codeHint'))}</p>
      <p id="code-err" role="alert"></p>
      <div class="row"><button type="submit">${esc(T('restoreBtn'))}</button>
      <button type="button" class="secondary" data-go="home">${esc(T('cancel'))}</button></div>
    </form>`);
  const input = $<HTMLInputElement>('#code-in', main);
  $('#restore', main).addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = decode(input.value);
    if (!r.ok) { input.setAttribute('aria-invalid', 'true'); $('#code-err', main).textContent = decodeError(r.error); input.focus(); return; }
    const matched = await resolvePackForHash(r.progress.packHash);
    if (!matched) { input.setAttribute('aria-invalid', 'true'); $('#code-err', main).textContent = decodeError('pack'); input.focus(); return; }
    pack = matched; packId = matched.id; progress = r.progress; persist();
    show('restored', `<h1>${esc(T('restored'))}</h1>
      <p>${esc(tx(matched.title))} · ${esc(T('preTitle'))}: ${bitsCount(progress.preMask)}/${matched.checkLength} · ${esc(T('practiceCorrect'))}: ${progress.skills.reduce((a, s) => a + s.correct, 0)}</p>
      <div class="row"><button type="button" data-go="continue">${esc(T('continue'))}</button></div>`);
  });
}

function endView() {
  const code = encode(progress);
  show('end', `
    <h1>${esc(T('endTitle'))}</h1>
    <p>${esc(T('endBody'))}</p>
    <p>${esc(T('endCodeFirst'))} <span class="code small">${code}</span></p>
    <label class="check"><input type="checkbox" id="wipe-offline">
      ${esc(T('wipeOffline'))}</label>
    <div class="row"><button type="button" class="danger" id="wipe">${esc(T('wipeYes'))}</button>
    <button type="button" class="secondary" data-go="continue">${esc(T('cancel'))}</button></div>`);
  $('#wipe', main).addEventListener('click', async () => {
    const r = await endSession($<HTMLInputElement>('#wipe-offline', main).checked);
    settings = defaultSettings(); progress = newProgress(packHash({ id: 'permission' }));
    packId = 'permission'; pack = null; customPack = null; applySettings();
    const extra = `${r.indexedDB ? `, ${r.indexedDB} ${T('idbWord')}` : ''}${r.caches ? `, ${r.caches} ${T('cacheWord')} ${T('ofWord')} ${r.serviceWorkers} ${T('swWord')}` : ''}`;
    // Keep English "and" structure close to the original wipe status for tests: "offline cache"
    const status = settings.lang === 'en'
      ? `${T('wiped')}${r.indexedDB ? `, ${r.indexedDB} IndexedDB database(s)` : ''}${r.caches ? `, ${r.caches} offline cache(s) and ${r.serviceWorkers} service worker(s)` : ''}.`
      : `${T('wiped')}${extra}.`;
    show('ended', `<h1>${esc(T('ended'))}</h1>
      <p role="status">${esc(status)}</p>
      <p>${esc(T('endNote'))}</p>
      <div class="row"><button type="button" data-go="home">${esc(T('startFresh'))}</button></div>`);
  });
}

function about() {
  show('about', `
    <h1>${esc(T('aboutTitle'))}</h1>
    <p>${esc(T('aboutLead'))}</p>
    <h2>${esc(T('contentH'))}</h2>
    <p>${esc(T('contentBody'))}
      <a href="https://creativecommons.org/licenses/by/4.0/">${esc(T('ccby'))}</a>.
      <a href="https://openstax.org/details/books/prealgebra-2e">${esc(T('openstax'))}</a>.</p>
    <h2>${esc(T('privacyAboutH'))}</h2>
    <p>${esc(T('privacyAbout'))}</p>
    <div class="row"><button type="button" data-go="home">${esc(T('back'))}</button></div>`);
}

function openBuilder() {
  view = 'builder';
  if (canSpeak) speechSynthesis.cancel();
  main.innerHTML = `<h1>${esc(T('packingWait'))}</h1>`;
  import('./builder').then((m) => {
    m.showBuilder({
      main, t: T, esc, lang: lang(),
      customPack,
      onHome: () => go('home'),
      onTry: (p: Pack) => { customPack = p; packId = p.id; pack = p; progress = newProgress(packHash(p)); persist(); go('start'); },
    });
  });
}

// ---------- navigation ----------
function go(where: string) {
  switch (where) {
    case 'home': return home();
    case 'start':
      return void withPack((p) => {
        progress = newProgress(packHash(p)); skill = p.skills[0]?.id ?? ''; persist();
        return check(p, 'pre');
      });
    case 'continue': return cont();
    case 'restore': return restoreView(pendingRestore);
    case 'begin-practice':
      return void withPack((p) => { progress.stage = 1; skill = p.skills[0]?.id ?? skill; persist(); return practice(p); });
    case 'practice':
      return void withPack((p) => { if (progress.stage === 0) progress.stage = 1; persist(); return practice(p); });
    case 'post':
      return void withPack((p) => {
        progress.stage = 2; persist();
        return progress.postCount >= p.checkLength ? results(p) : check(p, 'post');
      });
    case 'code': return codeView();
    case 'end': return endView();
    case 'about': return about();
    case 'builder': return openBuilder();
    case 'restart':
      return void withPack((p) => { progress = newProgress(packHash(p)); persist(); return check(p, 'pre'); });
  }
}

document.addEventListener('click', (e) => {
  const tEl = (e.target as HTMLElement).closest('[data-go],[data-skill],[data-speak]') as HTMLElement | null;
  if (!tEl) return;
  if (tEl.dataset.go) { e.preventDefault(); go(tEl.dataset.go); }
  else if (tEl.dataset.skill) {
    skill = tEl.dataset.skill;
    void withPack((p) => practice(p));
  }
  else if (tEl.dataset.speak) speak(tEl.dataset.speak);
});
$('#t-size').addEventListener('click', () => { settings.largeText = ((settings.largeText + 1) % 3) as 0 | 1 | 2; applySettings(); persist(); });
$('#t-contrast').addEventListener('click', () => { settings.contrast = !settings.contrast; applySettings(); persist(); });
$('#t-plain').addEventListener('click', () => { settings.plain = !settings.plain; applySettings(); persist(); rerender(); });
$('#t-lang').addEventListener('click', () => { settings.lang = settings.lang === 'en' ? 'es' : 'en'; applySettings(); persist(); rerender(); $('#t-lang').focus(); });

function rerender() {
  const focusId = document.activeElement?.id;
  if (view === 'builder') { openBuilder(); if (focusId === 't-plain' || focusId === 't-lang') $('#' + focusId)?.focus(); return; }
  const map: Record<string, () => void> = {
    home, practice: () => void withPack((p) => practice(p)), results: () => void withPack((p) => results(p)),
    code: codeView, about, end: endView, restore: () => restoreView(), predone: () => void withPack((p) => preDone(p)),
    pre: () => void withPack((p) => check(p, 'pre')), post: () => void withPack((p) => check(p, 'post')),
  };
  map[view]?.();
  if (focusId === 't-plain' || focusId === 't-lang') $('#' + focusId)?.focus();
}

// ---------- offline status ----------
const net = $('#net');
function updateNet() {
  net.textContent = navigator.onLine ? '' : T('offlineBanner');
  net.hidden = navigator.onLine;
}
addEventListener('online', updateNet); addEventListener('offline', updateNet);
updateNet();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('#sw-status').textContent = T('swReady');
  }).catch(() => { $('#sw-status').textContent = T('swFail'); });
}


async function updateStorageBadge() {
  const el = document.getElementById('storage-badge');
  if (!el) return;
  const s = await measureProgressStorage();
  const persistent = s.localBytes + s.idbProgressBytes + s.cacheProgressBytes;
  el.setAttribute('data-persistent-bytes', String(persistent));
  el.setAttribute('data-session-bytes', String(s.sessionBytes));
  const parts: string[] = [];
  if (settings.saveOnDevice) parts.push(T('storageSaved', { n: s.localBytes }));
  else parts.push(T('storageZero'));
  if (!settings.saveOnDevice && s.sessionBytes) parts.push(T('storageTab', { n: s.sessionBytes }));
  parts.push(T('storageShell'));
  if (s.idbDatabases) parts.push(T('storageIdbLeft', { n: s.idbDatabases }));
  el.textContent = parts.join(' ');
}

let escArmed = false;
let escTimer = 0;
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const live = document.getElementById('escape-live');
  if (view === 'end' || view === 'ended') return;
  e.preventDefault();
  if (escArmed) {
    escArmed = false;
    window.clearTimeout(escTimer);
    if (live) live.textContent = T('wipeEscGo');
    go('end');
    return;
  }
  escArmed = true;
  if (live) live.textContent = T('wipeEscHint');
  window.clearTimeout(escTimer);
  escTimer = window.setTimeout(() => {
    escArmed = false;
    if (live && live.textContent === T('wipeEscHint')) live.textContent = '';
  }, 2000);
});

// ---------- boot ----------
function handleHash(initial = false) {
  const hash = location.hash;
  if (/^#r=([0-9A-Za-z-]+)$/.test(hash)) {
    const code = hash.slice(3);
    history.replaceState(null, '', location.pathname + location.search);
    pendingRestore = normalizeInput(code);
    restoreView(pendingRestore);
  } else if (hash.startsWith('#p=')) {
    const r = decodePackHash(hash.slice(3));
    if (r.ok) { customPack = r.pack; packId = r.pack.id; pack = r.pack; persist(); }
    home(initial ? false : true);
  } else if (hash === '#builder') {
    openBuilder();
  } else if (initial) {
    home(false);
  }
}
applySettings();
handleHash(true);
void updateStorageBadge();
addEventListener('hashchange', () => handleHash());
