import './style.css';
import { CHECK_LEN, SKILLS, answerText, checkProblem, generate, grade, type FracSlot, type Problem, type Skill, type Text } from './fractions';
import { decode, encode, newProgress, normalizeInput, type Progress } from './resume';
import { defaultSettings, endSession, load, save, type Settings } from './storage';

// ---------- state ----------
const saved = load();
let settings: Settings = { ...defaultSettings(), ...(saved?.settings ?? {}) };
let progress: Progress = saved?.progress ?? newProgress();
let skill: Skill = 'equiv';
let hintLevel = 0;
let answered = false;
let view = 'home';

const SKILL_NAME: Record<Skill, Text> = {
  equiv: { std: 'Equivalent fractions', plain: 'Same amount, different numbers' },
  addsub: { std: 'Add & subtract', plain: 'Add and take away' },
  compare: { std: 'Compare fractions', plain: 'Which is bigger?' },
};
const STAGE_TARGET = 3; // correct answers per skill before we suggest the post-check

const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
const main = $('#main');
const tx = (t: Text) => (settings.plain ? t.plain : t.std);
const T = (std: string, plain: string) => (settings.plain ? plain : std);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function persist() { save(settings, progress); }

// ---------- math rendering ----------
function fracHTML(f: FracSlot): string {
  const sayPart = (v: number | '?') => (v === '?' ? 'blank' : String(v));
  return `<span class="frac"><span class="sr-only">${sayPart(f.n)} over ${sayPart(f.d)}</span>` +
    `<span class="fv" aria-hidden="true"><span class="num${f.n === '?' ? ' q' : ''}">${f.n}</span><span class="den${f.d === '?' ? ' q' : ''}">${f.d}</span></span></span>`;
}
/** Escape text, then show "a/b" as stacked fractions (with spoken "a over b"). */
function mathText(s: string): string {
  return esc(s).replace(/(\d+)\/(\d+)/g, (_, n, d) => fracHTML({ n: +n, d: +d }));
}
function problemHTML(p: Problem): string {
  const sym: Record<string, string> = { '+': 'plus', '−': 'minus', '=': 'equals' };
  return `<p class="math">` + p.parts.map((x) => {
    if (typeof x === 'string') return `<span class="op"><span aria-hidden="true">${esc(x)}</span><span class="sr-only">${sym[x] ?? x}</span></span>`;
    if ('blank' in x) return `<span class="blank"><span aria-hidden="true">?</span><span class="sr-only">blank</span></span>`;
    return fracHTML(x);
  }).join('') + `</p>`;
}
function barsHTML(p: Problem): string {
  if (!p.bars) return '';
  return `<div class="bars">` + p.bars.map((f) => {
    const w = 240, h = 28, cw = w / f.d;
    let cells = '';
    for (let i = 0; i < f.d; i++) cells += `<rect x="${i * cw}" y="0" width="${cw}" height="${h}" class="${i < f.n ? 'on' : 'off'}"/>`;
    return `<svg viewBox="-1 -1 ${w + 2} ${h + 2}" width="${w}" height="${h}" role="img" aria-label="Bar split into ${f.d} equal parts, ${f.n} shaded (${f.n} over ${f.d})" focusable="false">${cells}</svg>`;
  }).join('') + `</div>`;
}

// ---------- speech ----------
const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
function speak(text: string) {
  if (!canSpeak) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/(\d+)\/(\d+)/g, '$1 over $2').replace(/−/g, ' minus ').replace(/×/g, ' times '));
  u.rate = 0.9;
  speechSynthesis.speak(u);
}
const speakBtn = (text: string, label = 'Read aloud') =>
  canSpeak ? `<button type="button" class="secondary speak" data-speak="${esc(text)}"><span aria-hidden="true">🔊</span> ${label}</button>` : '';

// ---------- settings ----------
function applySettings() {
  const root = document.documentElement;
  root.classList.toggle('lt1', settings.largeText === 1);
  root.classList.toggle('lt2', settings.largeText === 2);
  root.classList.toggle('hc', settings.contrast);
  const sizeName = ['Normal', 'Large', 'Extra large'][settings.largeText];
  $('#t-size').textContent = `Text size: ${sizeName}`;
  $('#t-contrast').setAttribute('aria-pressed', String(settings.contrast));
  $('#t-plain').setAttribute('aria-pressed', String(settings.plain));
  $('#mode-status').textContent = settings.saveOnDevice
    ? 'Saving progress on this device.'
    : 'Leave-no-trace mode: progress is kept only in this tab.';
}

// ---------- views ----------
function show(name: string, html: string) {
  view = name;
  if (canSpeak) speechSynthesis.cancel();
  main.innerHTML = html;
  const h = $('h1, h2', main);
  if (h) { h.tabIndex = -1; h.focus(); }
  document.title = `${h?.textContent ?? 'ShareSafe Practice'} · ShareSafe Practice`;
}

function home() {
  const started = progress.preCount > 0 || progress.stage > 0;
  show('home', `
    <h1>${T('Practice fractions, privately', 'Practice fractions. No sign-up.')}</h1>
    <p>${T('Short lessons with hints and worked steps. No account, no name, no tracking. Works offline once loaded.',
        'Short practice with hints. You do not need an account. We do not ask your name. It works without internet after it loads.')}</p>
    <ol class="plan">
      <li>${T('Quick 6-question pre-check', 'A short quiz first (6 questions)')}</li>
      <li>${T('Practice with hints and worked steps', 'Practice, with help when you want it')}</li>
      <li>${T('Post-check to see how much you improved', 'A short quiz at the end to see how you grew')}</li>
    </ol>
    <div class="row">
      <button type="button" data-go="${started ? 'continue' : 'start'}">${started ? T('Continue', 'Keep going') : T('Start the pre-check', 'Start')}</button>
      <button type="button" class="secondary" data-go="restore">${T('I have a resume code', 'I have a code')}</button>
    </div>
    <section aria-labelledby="privacy-h" class="card">
      <h2 id="privacy-h">${T('Privacy on shared computers', 'Using a shared computer?')}</h2>
      <label class="check"><input type="checkbox" id="save-device" ${settings.saveOnDevice ? 'checked' : ''}>
        ${T('Save progress on this device (only on your own device)', 'Remember me on this device (only if it is your own)')}</label>
      <p class="hint-text">${T('Off by default. When off, nothing is kept after you close this tab. Use “End session” to wipe it right away. Your resume code lets you continue anywhere.',
        'This is off unless you turn it on. When off, closing the tab forgets everything. Press “End session” to forget right now. Your code lets you keep going on another device.')}</p>
    </section>`);
  $('#save-device', main).addEventListener('change', (e) => {
    settings.saveOnDevice = (e.target as HTMLInputElement).checked; persist(); applySettings();
  });
}

function cont() {
  if (progress.stage === 0) return progress.preCount >= CHECK_LEN ? preDone() : check('pre');
  if (progress.stage === 1) return practice();
  if (progress.stage === 2) return progress.postCount >= CHECK_LEN ? results() : check('post');
  return results();
}

// ----- answer form shared by checks and practice -----
function answerForm(p: Problem, submitLabel: string): string {
  let inputs = '';
  if (p.answer.kind === 'int') {
    inputs = `<label for="a-int">${T('Missing number', 'The missing number')}</label>
      <input id="a-int" name="int" inputmode="numeric" autocomplete="off" required>`;
  } else if (p.answer.kind === 'frac') {
    inputs = `<fieldset><legend>${T('Your answer as a fraction', 'Your answer')}</legend>
      <div class="frac-in">
        <label for="a-n">${T('Numerator (top)', 'Top number')}</label><input id="a-n" name="n" inputmode="numeric" autocomplete="off" required>
        <label for="a-d">${T('Denominator (bottom)', 'Bottom number')}</label><input id="a-d" name="d" inputmode="numeric" autocomplete="off" required>
      </div></fieldset>`;
  } else {
    inputs = `<fieldset class="cmp"><legend>${T('Choose the symbol', 'Pick one')}</legend>
      ${(['<', '>', '='] as const).map((s, i) => `<label class="radio"><input type="radio" name="cmp" value="${s}" ${i === 0 ? 'required' : ''}>
        <span class="sym" aria-hidden="true">${esc(s)}</span> ${{ '<': 'is less than', '>': 'is greater than', '=': 'is equal to' }[s]}</label>`).join('')}
      </fieldset>`;
  }
  return `<form id="answer" novalidate>${inputs}<div class="row"><button type="submit">${submitLabel}</button></div>
    <div id="feedback" role="status" aria-live="polite"></div></form>`;
}
function readForm(form: HTMLFormElement) {
  const fd = new FormData(form);
  return { int: fd.get('int') as string, n: fd.get('n') as string, d: fd.get('d') as string, cmp: fd.get('cmp') as string };
}
function spokenProblem(p: Problem) { return `${tx(p.prompt)}. ${p.speech}.`; }

function check(kind: 'pre' | 'post') {
  const i = kind === 'pre' ? progress.preCount : progress.postCount;
  const p = checkProblem(progress.seed, i, kind);
  const title = kind === 'pre' ? T('Pre-check', 'First quiz') : T('Post-check', 'Final quiz');
  show(kind, `
    <h1>${title}: ${T('question', 'question')} ${i + 1} ${T('of', 'of')} ${CHECK_LEN}</h1>
    <progress max="${CHECK_LEN}" value="${i}" aria-label="${title} progress">${i} of ${CHECK_LEN}</progress>
    <p class="hint-text">${T('No hints here. Just do your best; this shows where you start.', 'No help in this quiz. Just try your best.')}</p>
    <p class="prompt">${esc(tx(p.prompt))}.</p>
    ${problemHTML(p)}
    ${speakBtn(spokenProblem(p))}
    ${answerForm(p, T('Submit answer', 'Done'))}`);
  const form = $<HTMLFormElement>('#answer', main);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const g = grade(p, readForm(form));
    if (g.invalid) { $('#feedback', main).innerHTML = `<p class="warn">${esc(g.invalid)}</p>`; return; }
    if (kind === 'pre') { if (g.correct) progress.preMask |= 1 << i; progress.preCount++; }
    else { if (g.correct) progress.postMask |= 1 << i; progress.postCount++; }
    if (kind === 'post' && progress.postCount >= CHECK_LEN) progress.stage = 3;
    persist();
    const done = (kind === 'pre' ? progress.preCount : progress.postCount) >= CHECK_LEN;
    if (done) kind === 'pre' ? preDone() : results(); else check(kind);
  });
}

const bitsCount = (m: number) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };

function preDone() {
  const score = bitsCount(progress.preMask);
  show('predone', `
    <h1>${T('Pre-check done', 'First quiz done')}</h1>
    <p class="big">${T('You got', 'You got')} <strong>${score} ${T('of', 'out of')} ${CHECK_LEN}</strong>.</p>
    <p>${T('That’s your starting point. Now practise each skill with hints and worked steps.', 'That is where you start. Now let’s practice. You can ask for hints.')}</p>
    <div class="row"><button type="button" data-go="begin-practice">${T('Start practising', 'Start practice')}</button></div>`);
}

function practice() {
  const si = SKILLS.indexOf(skill);
  const sp = progress.skills[si];
  const p = generate(skill, progress.seed, sp.attempts, 'practice');
  hintLevel = 0; answered = false;
  const ready = progress.skills.every((s) => s.correct >= STAGE_TARGET);
  show('practice', `
    <h1>${T('Practice', 'Practice')}: ${esc(tx(SKILL_NAME[skill]))}</h1>
    <nav aria-label="${T('Choose a skill', 'Pick what to practice')}" class="skills">
      ${SKILLS.map((s, k) => `<button type="button" class="secondary" data-skill="${s}" aria-pressed="${s === skill}">
        ${esc(tx(SKILL_NAME[s]))} <span class="count">(${progress.skills[k].correct} ${T('correct', 'right')})</span></button>`).join('')}
    </nav>
    <p class="prompt">${esc(tx(p.prompt))}.</p>
    ${problemHTML(p)}
    <div class="row">${speakBtn(spokenProblem(p))}</div>
    ${answerForm(p, T('Check answer', 'Check'))}
    <div class="row">
      <button type="button" class="secondary" id="hint-btn">${T('Show a hint', 'Help me')} (1 ${T('of', 'of')} ${p.hints.length})</button>
      <button type="button" class="secondary" id="steps-btn">${T('Show worked steps', 'Show me how')}</button>
      <button type="button" class="secondary" id="next-btn">${T('Next problem', 'Next one')}</button>
    </div>
    <section id="help" aria-live="polite"></section>
    <section class="card" aria-labelledby="next-h">
      <h2 id="next-h">${T('When you’re ready', 'When you are ready')}</h2>
      <p>${ready ? T('You’ve got 3+ correct in every skill. Nice! Try the post-check.', 'You got 3 or more right in each part. Great! Try the final quiz.')
                 : T(`Tip: aim for ${STAGE_TARGET} correct in each skill, then take the post-check.`, `Try to get ${STAGE_TARGET} right in each part. Then take the final quiz.`)}</p>
      <div class="row"><button type="button" class="${ready ? '' : 'secondary'}" data-go="post">${T('Take the post-check', 'Take the final quiz')}</button>
      <button type="button" class="secondary" data-go="code">${T('Get my resume code', 'Get my code')}</button></div>
    </section>`);

  const help = $('#help', main);
  const hintBtn = $<HTMLButtonElement>('#hint-btn', main);
  hintBtn.addEventListener('click', () => {
    if (hintLevel >= p.hints.length) return;
    hintLevel++;
    progress.hints = Math.min(63, progress.hints + 1); persist();
    help.innerHTML = `<h2>${T('Hints', 'Help')}</h2>` + (hintLevel === 1 ? barsHTML(p) : barsHTML(p)) +
      `<ol class="hints">${p.hints.slice(0, hintLevel).map((h) => `<li>${mathText(tx(h))}</li>`).join('')}</ol>` +
      speakBtn(tx(p.hints[hintLevel - 1]), T('Read this hint', 'Read help out loud'));
    if (hintLevel >= p.hints.length) { hintBtn.disabled = true; hintBtn.textContent = T('No more hints', 'No more help'); }
    else hintBtn.textContent = `${T('Show a hint', 'Help me')} (${hintLevel + 1} ${T('of', 'of')} ${p.hints.length})`;
  });
  $('#steps-btn', main).addEventListener('click', () => showSteps(p));
  $('#next-btn', main).addEventListener('click', () => {
    if (!answered) { progress.skills[si].attempts = Math.min(63, sp.attempts + 1); persist(); }
    practice();
  });
  const form = $<HTMLFormElement>('#answer', main);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fb = $('#feedback', main);
    if (answered) return;
    const g = grade(p, readForm(form));
    if (g.invalid) { fb.innerHTML = `<p class="warn">${esc(g.invalid)}</p>`; return; }
    if (g.correct) {
      answered = true;
      sp.attempts = Math.min(63, sp.attempts + 1);
      sp.correct = Math.min(31, sp.correct + 1);
      persist();
      fb.innerHTML = `<p class="ok"><span aria-hidden="true">✓</span> ${T('Correct!', 'Yes, that’s right!')}` +
        (g.simplestNote ? ` ${mathText(T(`In simplest form that’s ${answerText({ kind: 'frac', value: g.simplestNote })}.`, `The simplest way to write it is ${answerText({ kind: 'frac', value: g.simplestNote })}.`))}` : '') + `</p>`;
      form.querySelectorAll('input,button[type=submit]').forEach((el) => ((el as HTMLInputElement).disabled = true));
      const cnt = $(`[data-skill="${skill}"] .count`, main); if (cnt) cnt.textContent = `(${sp.correct} ${T('correct', 'right')})`;
      $<HTMLButtonElement>('#next-btn', main).focus();
    } else {
      fb.innerHTML = `<p class="warn">${T('Not quite. Try again, or open a hint.', 'Not yet. Try again, or press “Help me”.')}</p>`;
    }
  });
}

function showSteps(p: Problem) {
  $('#help', main).innerHTML = `<h2>${T('Worked steps', 'How to do it')}</h2>${barsHTML(p)}
    <ol class="steps">${p.steps.map((s) => `<li>${mathText(tx(s))}</li>`).join('')}</ol>
    <p>${T('Answer', 'Answer')}: <strong>${mathText(answerText(p.answer))}</strong></p>
    ${speakBtn(p.steps.map(tx).join(' '), T('Read the steps', 'Read out loud'))}`;
  if (!answered) {
    // Seeing the solution counts as an attempt (not a correct answer).
    answered = true;
    const sp = progress.skills[SKILLS.indexOf(p.skill)];
    sp.attempts = Math.min(63, sp.attempts + 1); persist();
    $<HTMLFormElement>('#answer', main).querySelectorAll('input,button[type=submit]').forEach((el) => ((el as HTMLInputElement).disabled = true));
  }
  $<HTMLButtonElement>('#next-btn', main).focus();
}

function results() {
  const pre = bitsCount(progress.preMask), post = bitsCount(progress.postMask);
  const per = (mask: number, k: number) => bitsCount(mask & ((1 << k) | (1 << (k + 3))));
  const diff = post - pre;
  show('results', `
    <h1>${T('Your results', 'How you did')}</h1>
    <p class="big">${T('Before', 'Before')}: <strong>${pre}/${CHECK_LEN}</strong> → ${T('After', 'After')}: <strong>${post}/${CHECK_LEN}</strong>
      ${diff > 0 ? `<span class="ok">(+${diff})</span>` : ''}</p>
    <table>
      <caption>${T('Score by skill (2 questions each)', 'Score for each part (2 questions each)')}</caption>
      <thead><tr><th scope="col">${T('Skill', 'Part')}</th><th scope="col">${T('Pre-check', 'First quiz')}</th><th scope="col">${T('Post-check', 'Final quiz')}</th><th scope="col">${T('Practice correct', 'Practice right')}</th></tr></thead>
      <tbody>${SKILLS.map((s, k) => `<tr><th scope="row">${esc(tx(SKILL_NAME[s]))}</th><td>${per(progress.preMask, k)}/2</td><td>${progress.stage === 3 ? per(progress.postMask, k) + '/2' : '—'}</td><td>${progress.skills[k].correct}</td></tr>`).join('')}</tbody>
    </table>
    <p>${T('Hints opened', 'Times you asked for help')}: ${progress.hints}</p>
    <div class="row">
      <button type="button" data-go="practice">${T('Keep practising', 'Practice more')}</button>
      <button type="button" class="secondary" data-go="code">${T('Get my resume code', 'Get my code')}</button>
      <button type="button" class="secondary" data-go="restart">${T('Start over', 'Start again')}</button>
    </div>`);
}

function codeView() {
  const code = encode(progress);
  const url = `${location.origin}${location.pathname}#r=${code.replace(/-/g, '')}`;
  show('code', `
    <h1>${T('Your resume code', 'Your code')}</h1>
    <p>${T('Write this down or scan the QR code with your phone. Enter it on any device to continue where you left off.',
        'Write this down, or point your phone camera at the square. Type it in on any device to keep going.')}</p>
    <p class="code" id="the-code" aria-label="Resume code: ${code.replace(/-/g, '').split('').join(' ')}">${code}</p>
    <div class="row">
      <button type="button" class="secondary" id="copy">${T('Copy code', 'Copy')}</button>
      ${speakBtn(`Your code is: ${code.replace(/-/g, '').split('').join(', ')}`, T('Spell it out loud', 'Read code out loud'))}
    </div>
    <figure class="qr"><div id="qr-slot" class="qr-slot"></div><figcaption>${T('Scan to continue on a phone', 'Scan with a phone')}</figcaption></figure>
    <details class="card"><summary>${T('What’s in the code? Is it secure?', 'What is in the code?')}</summary>
      <p>${T('Only a random problem number and your scores and counts, no name, no device ID. The last 2 characters are a checksum that catches typos (any single wrong character, or two swapped neighbours).',
        'Only your scores and a random number. No name. The last 2 letters check for typing mistakes.')}</p>
      <p>${T('Honest note: the checksum catches mistakes, not cheating. Someone who studies the app could make a fake code. That’s OK, because this is for your own practice, not a grade.',
        'The code catches typos. It does not stop someone from making a fake code. That is OK. This is only for your own practice.')}</p>
    </details>
    <div class="row"><button type="button" data-go="continue">${T('Back to practice', 'Go back')}</button></div>`);
  // QR library is lazy-loaded (still precached for offline use) to keep first load small.
  import('./qr').then(({ qrSvg }) => {
    const slot = $('#qr-slot', main);
    if (slot) slot.innerHTML = qrSvg(url, T('QR code with a link to continue using your resume code', 'Square code to scan with a phone'));
  });
  $('#copy', main).addEventListener('click', async () => {
    const btn = $('#copy', main);
    try { await navigator.clipboard.writeText(code); btn.textContent = T('Copied', 'Copied'); }
    catch { btn.textContent = T('Copy failed: select the code and copy it', 'Could not copy'); }
  });
}

function restoreView(prefill = '') {
  show('restore', `
    <h1>${T('Continue with a resume code', 'Type your code')}</h1>
    <form id="restore" novalidate>
      <label for="code-in">${T('Resume code (18 letters and numbers; dashes optional)', 'Your code (18 letters and numbers)')}</label>
      <input id="code-in" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(prefill)}" aria-describedby="code-help code-err">
      <p id="code-help" class="hint-text">${T('Capital or small letters both work. O and 0 count as the same, as do I, L and 1.', 'Big or small letters are fine.')}</p>
      <p id="code-err" role="alert"></p>
      <div class="row"><button type="submit">${T('Restore progress', 'Continue')}</button>
      <button type="button" class="secondary" data-go="home">${T('Cancel', 'Back')}</button></div>
    </form>`);
  const input = $<HTMLInputElement>('#code-in', main);
  $('#restore', main).addEventListener('submit', (e) => {
    e.preventDefault();
    const r = decode(input.value);
    if (!r.ok) { input.setAttribute('aria-invalid', 'true'); $('#code-err', main).textContent = r.error; input.focus(); return; }
    progress = r.progress; persist();
    show('restored', `<h1>${T('Progress restored', 'Welcome back!')}</h1>
      <p>${T('Pre-check', 'First quiz')}: ${bitsCount(progress.preMask)}/${CHECK_LEN} · ${T('Practice correct', 'Practice right')}: ${progress.skills.reduce((a, s) => a + s.correct, 0)}</p>
      <div class="row"><button type="button" data-go="continue">${T('Continue', 'Keep going')}</button></div>`);
  });
}

function endView() {
  const code = encode(progress);
  show('end', `
    <h1>${T('End session and wipe this device', 'End and forget')}</h1>
    <p>${T('This removes everything this app stored in this browser: progress and settings (local and session storage) and any IndexedDB data.',
        'This deletes everything this app saved in this browser.')}</p>
    <p>${T('Want to continue later? Write down your code first:', 'Want to keep going later? Write down your code first:')} <span class="code small">${code}</span></p>
    <label class="check"><input type="checkbox" id="wipe-offline">
      ${T('Also remove the offline copy of the app (it contains no personal data, but removes all trace of the app)', 'Also delete the offline copy of the app')}</label>
    <div class="row"><button type="button" class="danger" id="wipe">${T('Yes, wipe and end session', 'Yes, forget everything')}</button>
    <button type="button" class="secondary" data-go="continue">${T('Cancel', 'No, go back')}</button></div>`);
  $('#wipe', main).addEventListener('click', async () => {
    const r = await endSession($<HTMLInputElement>('#wipe-offline', main).checked);
    settings = defaultSettings(); progress = newProgress(); applySettings();
    show('ended', `<h1>${T('Session ended', 'All done. Forgotten.')}</h1>
      <p role="status">${T('Wiped: local and session storage', 'Deleted: saved progress and settings')}${r.indexedDB ? `, ${r.indexedDB} IndexedDB database(s)` : ''}${r.caches ? `, ${r.caches} offline cache(s) and ${r.serviceWorkers} service worker(s)` : ''}.</p>
      <p>${T('Close this tab when you’re done. Note: the browser’s own history may still list that this site was visited. A private/incognito window avoids that.',
          'Close this tab now. The browser history may still show this website. A private window avoids that.')}</p>
      <div class="row"><button type="button" data-go="home">${T('Start fresh', 'Start again')}</button></div>`);
  });
}

function about() {
  show('about', `
    <h1>${T('About & credits', 'About this app')}</h1>
    <p>ShareSafe Practice ${T('is a free, offline-first practice app for students using old phones or shared and library computers.', 'helps students practice on old phones or shared computers.')}</p>
    <h2>${T('Content credit', 'Where the lessons come from')}</h2>
    <p>${T('Topics follow', 'Topics follow')} <cite>Prealgebra 2e</cite>, ${T('Chapter 4 “Fractions”, by Lynn Marecek, MaryAnne Anthony-Smith and Andrea Honeycutt Mathis, © OpenStax / Rice University, licensed under', 'Chapter 4, by OpenStax, shared under')}
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. ${T('Access for free at', 'Free at')} <a href="https://openstax.org/details/books/prealgebra-2e">openstax.org</a>.
      ${T('Changes: no text was copied; all problems, hints and steps here are original and generated by code.', 'We wrote our own problems.')}</p>
    <h2>${T('Privacy', 'Privacy')}</h2>
    <p>${T('No accounts, no analytics, no network requests after the first load. Nothing leaves your device.', 'No sign-up. No tracking. Nothing is sent anywhere.')}</p>
    <div class="row"><button type="button" data-go="home">${T('Back', 'Back')}</button></div>`);
}

// ---------- navigation ----------
function go(where: string) {
  switch (where) {
    case 'home': return home();
    case 'start': progress = newProgress(); persist(); return check('pre');
    case 'continue': return view === 'home' || view === 'restored' || view === 'code' || view === 'end' ? cont() : cont();
    case 'restore': return restoreView();
    case 'begin-practice': progress.stage = 1; persist(); return practice();
    case 'practice': if (progress.stage === 3 || progress.stage === 0) { if (progress.stage === 0) progress.stage = 1; } persist(); return practice();
    case 'post': progress.stage = 2; persist(); return progress.postCount >= CHECK_LEN ? results() : check('post');
    case 'code': return codeView();
    case 'end': return endView();
    case 'about': return about();
    case 'restart': progress = newProgress(); persist(); return check('pre');
  }
}

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('[data-go],[data-skill],[data-speak]') as HTMLElement | null;
  if (!t) return;
  if (t.dataset.go) { e.preventDefault(); go(t.dataset.go); }
  else if (t.dataset.skill) { skill = t.dataset.skill as Skill; practice(); }
  else if (t.dataset.speak) speak(t.dataset.speak);
});
$('#t-size').addEventListener('click', () => { settings.largeText = ((settings.largeText + 1) % 3) as 0 | 1 | 2; applySettings(); persist(); });
$('#t-contrast').addEventListener('click', () => { settings.contrast = !settings.contrast; applySettings(); persist(); });
$('#t-plain').addEventListener('click', () => { settings.plain = !settings.plain; applySettings(); persist(); rerender(); });
function rerender() {
  const focusId = document.activeElement?.id;
  ({ home, practice, results, code: codeView, about, end: endView, restore: () => restoreView(), predone: preDone,
     pre: () => check('pre'), post: () => check('post') } as Record<string, () => void>)[view]?.();
  if (focusId === 't-plain') $('#t-plain').focus();
}

// ---------- offline status ----------
const net = $('#net');
function updateNet() {
  net.textContent = navigator.onLine ? '' : 'You are offline. Everything still works.';
  net.hidden = navigator.onLine;
}
addEventListener('online', updateNet); addEventListener('offline', updateNet);
updateNet();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('#sw-status').textContent = 'Ready to work offline.';
  }).catch(() => { $('#sw-status').textContent = 'Offline mode unavailable in this browser.'; });
}

// ---------- boot ----------
applySettings();
const m = location.hash.match(/^#r=([0-9A-Za-z-]+)$/);
if (m) {
  history.replaceState(null, '', location.pathname + location.search); // don't leave the code in the address bar
  restoreView(normalizeInput(m[1]));
} else home();
