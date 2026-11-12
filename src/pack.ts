// Content-pack types, hashing, validation, and URL (de)coding. Packs are data:
// the player renders whatever pack is loaded. Built-in packs are lazy-loaded.

export type Lang = 'en' | 'es';
export interface Text { std: string; plain: string }
export interface LText { en: Text; es?: Text }

export type RoleId = 'you' | 'group' | 'class' | 'teacher' | 'public';
export type AccessLevel = 'none' | 'view' | 'edit';
export const ROLES: RoleId[] = ['you', 'group', 'class', 'teacher', 'public'];
export const ACCESS_LEVELS: AccessLevel[] = ['none', 'view', 'edit'];

export interface Choice { id: string; text: LText }
export interface Message {
  from: string;
  subject: LText;
  body: LText;
}
export interface AccessFile {
  name: LText;
  summary: LText;
  roles: RoleId[];
  correct: Partial<Record<RoleId, AccessLevel>>;
}

export type ItemKind = 'choice' | 'access' | 'message';

export interface Item {
  id: string;
  skill: string;
  kind: ItemKind;
  prompt: LText;
  choices?: Choice[];
  /** For choice/message items: the correct choice id. */
  answer?: string;
  hints?: LText[];
  steps?: LText[];
  explanation?: LText;
  /** Red or green flags shown after a message is classified. */
  flags?: LText[];
  message?: Message;
  access?: AccessFile;
}

export interface SkillDef { id: string; name: LText }

export interface Intro {
  title: LText;
  body: LText[];
  mock?: { status: string; url: string; message: LText };
}

export type PracticeSpec = Item[] | { generated: 'fractions' };

export interface Pack {
  id: string;
  version: 1;
  title: LText;
  description: LText;
  intro?: Intro;
  skills: SkillDef[];
  /** Target correct answers per skill before the post-check is encouraged. */
  stageTarget: number;
  checkLength: number;
  pre: Item[];
  practice: PracticeSpec;
  post: Item[];
  credit?: LText;
}

/** 10-bit FNV-1a of a pack id (built-in) or id + canonical JSON (custom). */
export function packHash(pack: { id: string; custom?: boolean } | Pack): number {
  const custom = !isBuiltinId(pack.id);
  const input = custom ? pack.id + '|' + canonicalize(pack as Pack) : pack.id;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h & 0x3ff;
}

export const BUILTIN_IDS = ['permission', 'scam', 'fractions'] as const;
export type BuiltinId = (typeof BUILTIN_IDS)[number];
export const isBuiltinId = (id: string): id is BuiltinId =>
  (BUILTIN_IDS as readonly string[]).includes(id);

function canonicalize(pack: Pack): string {
  // Stable enough for hashing teacher packs: JSON key order as authored.
  return JSON.stringify({
    id: pack.id, title: pack.title, description: pack.description,
    skills: pack.skills, checkLength: pack.checkLength, stageTarget: pack.stageTarget,
    pre: pack.pre, practice: pack.practice, post: pack.post,
  });
}

export function isGenerated(p: PracticeSpec): p is { generated: 'fractions' } {
  return !Array.isArray(p) && p.generated === 'fractions';
}

export function practiceItems(pack: Pack): Item[] {
  return isGenerated(pack.practice) ? [] : pack.practice;
}

export function pickText(t: LText, lang: Lang, plain: boolean): string {
  const loc = (lang === 'es' && t.es) ? t.es : t.en;
  return plain ? loc.plain : loc.std;
}

export function hasLocale(t: LText, lang: Lang): boolean {
  return lang === 'en' || !!t.es;
}

export type PackIssue = { path: string; message: string };

export function validatePack(raw: unknown): { ok: true; pack: Pack } | { ok: false; errors: PackIssue[] } {
  const errors: PackIssue[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  if (!raw || typeof raw !== 'object') return { ok: false, errors: [{ path: '', message: 'Pack must be a JSON object.' }] };
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(o.id)) err('id', 'Use a short id of lowercase letters, numbers, or dashes (max 40).');
  if (isBuiltinId(String(o.id))) err('id', 'That id is reserved for a built-in pack. Choose another.');
  const title = asLText(o.title, 'title', err);
  const description = asLText(o.description, 'description', err);
  const checkLength = Number(o.checkLength);
  if (!Number.isInteger(checkLength) || checkLength < 1 || checkLength > 6) err('checkLength', 'Pre/post length must be a whole number from 1 to 6.');
  const stageTarget = Number(o.stageTarget ?? 1);
  if (!Number.isInteger(stageTarget) || stageTarget < 1 || stageTarget > 15) err('stageTarget', 'stageTarget must be a whole number from 1 to 15.');
  const skills = asSkills(o.skills, err);
  const pre = asItems(o.pre, 'pre', err);
  const post = asItems(o.post, 'post', err);
  let practice: PracticeSpec = [];
  if (o.practice && typeof o.practice === 'object' && !Array.isArray(o.practice) && (o.practice as { generated?: string }).generated === 'fractions') {
    err('practice', 'Generated fractions practice is reserved for the built-in pack.');
  } else {
    practice = asItems(o.practice, 'practice', err) ?? [];
  }
  if (pre && pre.length < 1) err('pre', 'Add at least one pre-check question.');
  if (post && post.length < 1) err('post', 'Add at least one post-check question.');
  if (Array.isArray(practice) && practice.length < 1) err('practice', 'Add at least one practice item.');
  if (pre && checkLength && pre.length !== checkLength) err('pre', `Pre-check has ${pre.length} question(s) but checkLength is ${checkLength}.`);
  if (post && checkLength && post.length !== checkLength) err('post', `Post-check has ${post.length} question(s) but checkLength is ${checkLength}.`);
  if (errors.length) return { ok: false, errors };
  const pack: Pack = {
    id: o.id as string, version: 1, title: title!, description: description!,
    skills: skills ?? [{ id: 'general', name: { en: { std: 'Practice', plain: 'Practice' } } }],
    stageTarget, checkLength, pre: pre!, practice: practice as Item[], post: post!,
  };
  if (o.intro) pack.intro = o.intro as Intro;
  if (o.credit) pack.credit = asLText(o.credit, 'credit', err) ?? undefined;
  return errors.length ? { ok: false, errors } : { ok: true, pack };
}

function asLText(v: unknown, path: string, err: (p: string, m: string) => void): LText | undefined {
  if (!v || typeof v !== 'object') { err(path, 'Needs English text ({ en: { std, plain } }).'); return; }
  const en = (v as LText).en;
  if (!en || typeof en.std !== 'string' || typeof en.plain !== 'string' || !en.std.trim()) {
    err(path, 'Needs en.std and en.plain text.');
    return;
  }
  const out: LText = { en: { std: en.std, plain: en.plain } };
  const es = (v as LText).es;
  if (es) {
    if (typeof es.std !== 'string' || typeof es.plain !== 'string') err(path + '.es', 'Spanish text needs std and plain.');
    else out.es = { std: es.std, plain: es.plain };
  }
  return out;
}

function asSkills(v: unknown, err: (p: string, m: string) => void): SkillDef[] | undefined {
  if (!Array.isArray(v) || v.length < 1) {
    return [{ id: 'general', name: { en: { std: 'Practice', plain: 'Practice' } } }];
  }
  if (v.length > 3) err('skills', 'A pack can have at most 3 skills (the resume code has three slots).');
  const out: SkillDef[] = [];
  v.slice(0, 3).forEach((s, i) => {
    if (!s || typeof s !== 'object') { err(`skills[${i}]`, 'Invalid skill.'); return; }
    const id = (s as SkillDef).id;
    if (typeof id !== 'string' || !id) { err(`skills[${i}].id`, 'Each skill needs an id.'); return; }
    const name = asLText((s as SkillDef).name, `skills[${i}].name`, err);
    if (name) out.push({ id, name });
  });
  return out;
}

function asItems(v: unknown, path: string, err: (p: string, m: string) => void): Item[] | undefined {
  if (!Array.isArray(v)) { err(path, 'Must be a list of items.'); return; }
  if (v.length > 12) err(path, 'Please keep this list to 12 items or fewer so packs stay small.');
  const out: Item[] = [];
  v.forEach((it, i) => {
    const p = `${path}[${i}]`;
    if (!it || typeof it !== 'object') { err(p, 'Invalid item.'); return; }
    const o = it as Item;
    if (typeof o.id !== 'string' || !o.id) err(p + '.id', 'Each item needs an id.');
    const kind = o.kind;
    if (kind !== 'choice' && kind !== 'access' && kind !== 'message') err(p + '.kind', 'kind must be choice, access, or message.');
    const prompt = asLText(o.prompt, p + '.prompt', err);
    const item: Item = { id: o.id || `item-${i}`, skill: typeof o.skill === 'string' ? o.skill : 'general', kind: kind || 'choice', prompt: prompt || { en: { std: '', plain: '' } } };
    if (kind === 'choice' || kind === 'message') {
      if (!Array.isArray(o.choices) || o.choices.length < 2) err(p + '.choices', 'Add at least two choices.');
      else {
        item.choices = o.choices.map((c, j) => ({
          id: c?.id || String(j),
          text: asLText(c?.text, `${p}.choices[${j}]`, err) || { en: { std: '', plain: '' } },
        }));
        const ids = new Set(item.choices.map((c) => c.id));
        if (typeof o.answer !== 'string' || !ids.has(o.answer)) err(p + '.answer', 'answer must be the id of one choice.');
        else item.answer = o.answer;
      }
    }
    if (kind === 'message') {
      if (!o.message) err(p + '.message', 'A message item needs from, subject and body.');
      else {
        const sub = asLText(o.message.subject, p + '.message.subject', err);
        const body = asLText(o.message.body, p + '.message.body', err);
        item.message = { from: String(o.message.from || ''), subject: sub || { en: { std: '', plain: '' } }, body: body || { en: { std: '', plain: '' } } };
      }
      if (Array.isArray(o.flags)) item.flags = o.flags.map((f, j) => asLText(f, `${p}.flags[${j}]`, err)!).filter(Boolean);
    }
    if (kind === 'access') {
      if (!o.access) err(p + '.access', 'An access item needs a file, roles and correct permissions.');
      else {
        const name = asLText(o.access.name, p + '.access.name', err);
        const summary = asLText(o.access.summary, p + '.access.summary', err);
        const roles = Array.isArray(o.access.roles) ? o.access.roles.filter((r): r is RoleId => ROLES.includes(r)) : [];
        if (roles.length < 1) err(p + '.access.roles', 'Pick at least one role.');
        item.access = { name: name || { en: { std: 'File', plain: 'File' } }, summary: summary || { en: { std: '', plain: '' } }, roles, correct: o.access.correct || {} };
        for (const r of roles) {
          if (!ACCESS_LEVELS.includes((item.access.correct[r] || '') as AccessLevel)) err(p + `.access.correct.${r}`, 'Set none, view, or edit for each role.');
        }
      }
    }
    if (Array.isArray(o.hints)) item.hints = o.hints.map((h, j) => asLText(h, `${p}.hints[${j}]`, err)!).filter(Boolean);
    if (Array.isArray(o.steps)) item.steps = o.steps.map((h, j) => asLText(h, `${p}.steps[${j}]`, err)!).filter(Boolean);
    if (o.explanation) item.explanation = asLText(o.explanation, p + '.explanation', err);
    out.push(item);
  });
  return out;
}

/** Comfortable printed QR: keep the whole URL at or under this many characters. */
export const QR_COMFORT = 1200;
export const QR_MAX = 2500;

export function encodePackHash(pack: Pack): string {
  const json = JSON.stringify(pack);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodePackHash(s: string): { ok: true; pack: Pack } | { ok: false; error: string } {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const r = validatePack(JSON.parse(json));
    if (r.ok) return r;
    return { ok: false, error: r.errors.map((e) => e.message).join(' ') };
  } catch {
    return { ok: false, error: 'This pack link is damaged or incomplete.' };
  }
}

export function packBytes(pack: Pack): number {
  return new TextEncoder().encode(JSON.stringify(pack)).length;
}

export function packUrl(origin: string, path: string, pack: Pack): { url: string; jsonBytes: number; urlLength: number; qr: 'ok' | 'tight' | 'too-big' } {
  const payload = encodePackHash(pack);
  const url = `${origin}${path}#p=${payload}`;
  const jsonBytes = packBytes(pack);
  const urlLength = url.length;
  const qr = urlLength <= QR_COMFORT ? 'ok' : urlLength <= QR_MAX ? 'tight' : 'too-big';
  return { url, jsonBytes, urlLength, qr };
}

export interface CatalogEntry {
  id: BuiltinId;
  title: LText;
  description: LText;
  load: () => Promise<Pack>;
}

export const CATALOG: CatalogEntry[] = [
  {
    id: 'permission',
    title: {
      en: { std: 'Permission to Learn', plain: 'Permission to Learn' },
      es: { std: 'Permiso para aprender', plain: 'Permiso para aprender' },
    },
    description: {
      en: {
        std: 'A confusing “403 Forbidden” error, then a practice: who should view or edit a class roster, a group project, and personal notes?',
        plain: 'You see a “403 Forbidden” error. Then you decide who should open or change a few school files.',
      },
      es: {
        std: 'Un error confuso de “403 Forbidden” y, después, una práctica: ¿quién debería ver o editar la lista de la clase, un proyecto de equipo y notas personales?',
        plain: 'Aparece un error “403 Forbidden”. Luego decides quién puede abrir o cambiar unos archivos de la escuela.',
      },
    },
    load: () => import('./packs/permission').then((m) => m.pack),
  },
  {
    id: 'scam',
    title: {
      en: { std: 'Spot the Scam', plain: 'Spot the Scam' },
      es: { std: 'Detecta la estafa', plain: 'Detecta la estafa' },
    },
    description: {
      en: {
        std: 'Look at fictional student messages — a fake scholarship, a phishing login, and a real school notice — and learn the red flags.',
        plain: 'Read made-up messages to a student. One is a fake prize, one is a fake login, and one is a real school note. Learn the warning signs.',
      },
      es: {
        std: 'Revisa mensajes ficticios para estudiantes — una beca falsa, un inicio de sesión fraudulento y un aviso escolar verdadero — y aprende las señales de alerta.',
        plain: 'Lee mensajes inventados. Uno es un premio falso, uno es un inicio de sesión falso y uno es un aviso real de la escuela. Aprende las señales.',
      },
    },
    load: () => import('./packs/scam').then((m) => m.pack),
  },
  {
    id: 'fractions',
    title: {
      en: { std: 'Fractions practice', plain: 'Fractions practice' },
      es: { std: 'Práctica de fracciones', plain: 'Práctica de fracciones' },
    },
    description: {
      en: {
        std: 'Equivalent fractions, add and subtract with unlike denominators, and compare. Unlimited generated problems, with hints and worked steps.',
        plain: 'Practice same-amount fractions, adding and taking away, and which is bigger. You can ask for hints and steps. New problems each time.',
      },
      es: {
        std: 'Fracciones equivalentes, sumar y restar con distinto denominador, y comparar. Problemas ilimitados, con pistas y pasos resueltos.',
        plain: 'Practica fracciones equivalentes, sumar y restar, y cuál es mayor. Puedes pedir pistas y pasos. Hay problemas nuevos cada vez.',
      },
    },
    load: () => import('./packs/fractions-pack').then((m) => m.pack),
  },
];

export function catalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.id === id);
}
