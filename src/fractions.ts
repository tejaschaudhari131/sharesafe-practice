// Procedural fraction problems. Problems are original and generated from a seed;
// the topic sequence (equivalent fractions, add/subtract with unlike
// denominators, comparing) follows OpenStax Prealgebra 2e, Chapter 4 (CC BY 4.0).

export type Skill = 'equiv' | 'addsub' | 'compare';
export const SKILLS: Skill[] = ['equiv', 'addsub', 'compare'];
export type Purpose = 'practice' | 'pre' | 'post';

export interface Text { std: string; plain: string }
export interface Frac { n: number; d: number }
/** A fraction where one slot may be the unknown. */
export interface FracSlot { n: number | '?'; d: number | '?' }

export type Answer =
  | { kind: 'int'; value: number }
  | { kind: 'frac'; value: Frac }
  | { kind: 'cmp'; value: '<' | '>' | '=' };

export interface BiText { en: Text; es: Text }

export interface Problem {
  id: string;
  skill: Skill;
  /** Parts of the question: strings and fractions, rendered in order. */
  parts: Array<string | FracSlot | { blank: true }>;
  prompt: BiText;
  speech: { en: string; es: string };
  answer: Answer;
  hints: BiText[];
  steps: BiText[];
  /** Optional visual model for hint 1: fraction bars to draw. */
  bars?: Frac[];
}

export function pickBi(t: BiText, lang: 'en' | 'es', plain: boolean): string {
  const loc = lang === 'es' ? t.es : t.en;
  return plain ? loc.plain : loc.std;
}
export function pickSpeech(p: Problem, lang: 'en' | 'es'): string {
  return lang === 'es' ? p.speech.es : p.speech.en;
}

const Bi = (enStd: string, enPlain: string, esStd: string, esPlain: string): BiText => ({
  en: { std: enStd, plain: enPlain },
  es: { std: esStd, plain: esPlain },
});

export function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
export function simplify(f: Frac): Frac {
  const g = gcd(f.n, f.d);
  return { n: f.n / g, d: f.d / g };
}
export const fracEq = (a: Frac, b: Frac) => a.n * b.d === b.n * a.d;
export const cmp = (a: Frac, b: Frac): '<' | '>' | '=' => {
  const x = a.n * b.d, y = b.n * a.d;
  return x < y ? '<' : x > y ? '>' : '=';
};
export const fs = (f: Frac) => `${f.n}/${f.d}`;
export const say = (f: Frac) => `${f.n} over ${f.d}`;
const sayEs = (f: Frac) => `${f.n} sobre ${f.d}`;

/** mulberry32: small deterministic PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mix(...xs: number[]) {
  let h = 2166136261;
  for (const x of xs) { h ^= x >>> 0; h = Math.imul(h, 16777619); h ^= h >>> 13; }
  return h >>> 0;
}
const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

/** A proper fraction in lowest terms with denominator from `dens`. */
function properFrac(r: () => number, dens: number[]): Frac {
  const d = pick(r, dens);
  let n = int(r, 1, d - 1);
  for (let i = 0; i < 20 && gcd(n, d) !== 1; i++) n = int(r, 1, d - 1);
  return simplify({ n, d });
}

function genEquiv(r: () => number): Omit<Problem, 'id' | 'skill'> {
  const base = properFrac(r, [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const k = int(r, 2, 5);
  const big = { n: base.n * k, d: base.d * k };
  const missingTop = r() < 0.6;
  if (missingTop) {
    return {
      parts: [base, '=', { n: '?', d: big.d }],
      prompt: Bi(
        `Find the missing numerator so the fractions are equivalent`,
        `Fill in the top number so both fractions are the same amount`,
        `Halla el numerador que falta para que las fracciones sean equivalentes`,
        `Escribe el número de arriba para que las dos fracciones sean la misma cantidad`,
      ),
      speech: { en: `${say(base)} equals what over ${big.d}?`, es: `${sayEs(base)} es igual a qué sobre ${big.d}?` },
      answer: { kind: 'int', value: big.n },
      bars: [base, big],
      hints: [
        Bi(`Compare the denominators: ${base.d} became ${big.d}. What was ${base.d} multiplied by?`,
          `Look at the bottom numbers. ${base.d} turned into ${big.d}. What did we times ${base.d} by?`,
          `Compara los denominadores: ${base.d} pasó a ${big.d}. ¿Por cuánto se multiplicó ${base.d}?`,
          `Mira los números de abajo. ${base.d} se convirtió en ${big.d}. ¿Por cuánto multiplicamos ${base.d}?`),
        Bi(`${base.d} × ${k} = ${big.d}, so the multiplier is ${k}.`, `${base.d} times ${k} is ${big.d}. So we times by ${k}.`,
          `${base.d} × ${k} = ${big.d}, así que el factor es ${k}.`, `${base.d} por ${k} es ${big.d}. Entonces multiplicamos por ${k}.`),
        Bi(`Multiply the numerator by the same number: ${base.n} × ${k} = ?`, `Do the same thing to the top: ${base.n} times ${k}.`,
          `Multiplica el numerador por el mismo número: ${base.n} × ${k} = ?`, `Haz lo mismo arriba: ${base.n} por ${k}.`),
      ],
      steps: [
        Bi(`Equivalent fractions: multiply numerator and denominator by the same nonzero number.`,
          `To make the same amount, times the top and bottom by the same number.`,
          `Fracciones equivalentes: multiplica el numerador y el denominador por el mismo número distinto de cero.`,
          `Para obtener la misma cantidad, multiplica arriba y abajo por el mismo número.`),
        Bi(`${base.d} × ${k} = ${big.d}`, `Bottom: ${base.d} × ${k} = ${big.d}`,
          `${base.d} × ${k} = ${big.d}`, `Abajo: ${base.d} × ${k} = ${big.d}`),
        Bi(`${base.n} × ${k} = ${big.n}`, `Top: ${base.n} × ${k} = ${big.n}`,
          `${base.n} × ${k} = ${big.n}`, `Arriba: ${base.n} × ${k} = ${big.n}`),
        Bi(`So ${fs(base)} = ${fs(big)}.`, `So ${fs(base)} is the same as ${fs(big)}.`,
          `Entonces ${fs(base)} = ${fs(big)}.`, `Entonces ${fs(base)} es lo mismo que ${fs(big)}.`),
      ],
    };
  }
  return {
    parts: [base, '=', { n: big.n, d: '?' }],
    prompt: Bi(
      `Find the missing denominator so the fractions are equivalent`,
      `Fill in the bottom number so both fractions are the same amount`,
      `Halla el denominador que falta para que las fracciones sean equivalentes`,
      `Escribe el número de abajo para que las dos fracciones sean la misma cantidad`,
    ),
    speech: { en: `${say(base)} equals ${big.n} over what?`, es: `${sayEs(base)} es igual a ${big.n} sobre qué?` },
    answer: { kind: 'int', value: big.d },
    bars: [base, big],
    hints: [
      Bi(`Compare the numerators: ${base.n} became ${big.n}. What was ${base.n} multiplied by?`,
        `Look at the top numbers. ${base.n} turned into ${big.n}. What did we times ${base.n} by?`,
        `Compara los numeradores: ${base.n} pasó a ${big.n}. ¿Por cuánto se multiplicó ${base.n}?`,
        `Mira los números de arriba. ${base.n} se convirtió en ${big.n}. ¿Por cuánto multiplicamos ${base.n}?`),
      Bi(`${base.n} × ${k} = ${big.n}, so the multiplier is ${k}.`, `${base.n} times ${k} is ${big.n}. So we times by ${k}.`,
        `${base.n} × ${k} = ${big.n}, así que el factor es ${k}.`, `${base.n} por ${k} es ${big.n}. Entonces multiplicamos por ${k}.`),
      Bi(`Multiply the denominator by the same number: ${base.d} × ${k} = ?`, `Do the same thing to the bottom: ${base.d} times ${k}.`,
        `Multiplica el denominador por el mismo número: ${base.d} × ${k} = ?`, `Haz lo mismo abajo: ${base.d} por ${k}.`),
    ],
    steps: [
      Bi(`Equivalent fractions: multiply numerator and denominator by the same nonzero number.`,
        `To make the same amount, times the top and bottom by the same number.`,
        `Fracciones equivalentes: multiplica el numerador y el denominador por el mismo número distinto de cero.`,
        `Para obtener la misma cantidad, multiplica arriba y abajo por el mismo número.`),
      Bi(`${base.n} × ${k} = ${big.n}`, `Top: ${base.n} × ${k} = ${big.n}`,
        `${base.n} × ${k} = ${big.n}`, `Arriba: ${base.n} × ${k} = ${big.n}`),
      Bi(`${base.d} × ${k} = ${big.d}`, `Bottom: ${base.d} × ${k} = ${big.d}`,
        `${base.d} × ${k} = ${big.d}`, `Abajo: ${base.d} × ${k} = ${big.d}`),
      Bi(`So ${fs(base)} = ${fs(big)}.`, `So ${fs(base)} is the same as ${fs(big)}.`,
        `Entonces ${fs(base)} = ${fs(big)}.`, `Entonces ${fs(base)} es lo mismo que ${fs(big)}.`),
    ],
  };
}

function genAddSub(r: () => number): Omit<Problem, 'id' | 'skill'> {
  const dens = [2, 3, 4, 5, 6, 8, 10, 12];
  let a = properFrac(r, dens), b = properFrac(r, dens);
  for (let i = 0; i < 30 && a.d === b.d; i++) b = properFrac(r, dens);
  const add = r() < 0.5;
  if (!add && cmp(a, b) !== '>') {
    if (cmp(a, b) === '=') b = { n: 1, d: b.d === 2 ? 3 : 2 };
    if (cmp(a, b) === '<') [a, b] = [b, a];
  }
  const L = lcm(a.d, b.d);
  const ka = L / a.d, kb = L / b.d;
  const A = { n: a.n * ka, d: L }, B = { n: b.n * kb, d: L };
  const raw = { n: add ? A.n + B.n : A.n - B.n, d: L };
  const ans = simplify(raw);
  const op = add ? '+' : '−';
  const word = add ? 'plus' : 'minus';
  const wordEs = add ? 'más' : 'menos';
  const opWord = add ? 'Add' : 'Subtract';
  const opWordEs = add ? 'Suma' : 'Resta';
  const simpler = ans.d !== raw.d;
  const g = raw.d / ans.d;
  return {
    parts: [a, op, b, '=', { blank: true }],
    prompt: Bi(
      `${opWord}. Write the answer as a fraction (simplest form preferred)`,
      `${add ? 'Add' : 'Take away'}. Type the top number and the bottom number of your answer.`,
      `${opWordEs}. Escribe la respuesta como fracción (se prefiere la forma simplificada)`,
      `${add ? 'Suma' : 'Resta'}. Escribe el número de arriba y el de abajo de tu respuesta.`,
    ),
    speech: { en: `${say(a)} ${word} ${say(b)}`, es: `${sayEs(a)} ${wordEs} ${sayEs(b)}` },
    answer: { kind: 'frac', value: ans },
    bars: [a, b],
    hints: [
      Bi(`The denominators (${a.d} and ${b.d}) are different. Find a common denominator: the least common multiple of ${a.d} and ${b.d}.`,
        `The bottom numbers (${a.d} and ${b.d}) are not the same. Find the smallest number both ${a.d} and ${b.d} go into.`,
        `Los denominadores (${a.d} y ${b.d}) son diferentes. Halla un denominador común: el mínimo común múltiplo de ${a.d} y ${b.d}.`,
        `Los números de abajo (${a.d} y ${b.d}) no son iguales. Halla el número más pequeño en el que caben ${a.d} y ${b.d}.`),
      Bi(`The LCD is ${L}. Rewrite: ${fs(a)} = ${fs(A)} and ${fs(b)} = ${fs(B)}.`,
        `Use ${L} as the bottom. ${fs(a)} becomes ${fs(A)}. ${fs(b)} becomes ${fs(B)}.`,
        `El mínimo común denominador es ${L}. Reescribe: ${fs(a)} = ${fs(A)} y ${fs(b)} = ${fs(B)}.`,
        `Usa ${L} abajo. ${fs(a)} se convierte en ${fs(A)}. ${fs(b)} se convierte en ${fs(B)}.`),
      Bi(`Now ${add ? 'add' : 'subtract'} the numerators and keep the denominator: ${A.n} ${op} ${B.n} = ${raw.n}, over ${L}.`,
        `Now ${add ? 'add' : 'take away'} only the top numbers: ${A.n} ${op} ${B.n}. Keep ${L} on the bottom.`,
        `Ahora ${add ? 'suma' : 'resta'} los numeradores y conserva el denominador: ${A.n} ${op} ${B.n} = ${raw.n}, sobre ${L}.`,
        `Ahora ${add ? 'suma' : 'resta'} solo los números de arriba: ${A.n} ${op} ${B.n}. Deja ${L} abajo.`),
    ],
    steps: [
      Bi(`LCD of ${a.d} and ${b.d} is ${L}.`, `The shared bottom number is ${L}.`,
        `El mínimo común denominador de ${a.d} y ${b.d} es ${L}.`, `El número de abajo compartido es ${L}.`),
      Bi(`${fs(a)} = ${a.n}×${ka} / ${a.d}×${ka} = ${fs(A)}`, `${fs(a)}: times top and bottom by ${ka} → ${fs(A)}`,
        `${fs(a)} = ${a.n}×${ka} / ${a.d}×${ka} = ${fs(A)}`, `${fs(a)}: multiplica arriba y abajo por ${ka} → ${fs(A)}`),
      Bi(`${fs(b)} = ${b.n}×${kb} / ${b.d}×${kb} = ${fs(B)}`, `${fs(b)}: times top and bottom by ${kb} → ${fs(B)}`,
        `${fs(b)} = ${b.n}×${kb} / ${b.d}×${kb} = ${fs(B)}`, `${fs(b)}: multiplica arriba y abajo por ${kb} → ${fs(B)}`),
      Bi(`${fs(A)} ${op} ${fs(B)} = ${fs(raw)}`, `${A.n} ${op} ${B.n} = ${raw.n}, so ${fs(raw)}`,
        `${fs(A)} ${op} ${fs(B)} = ${fs(raw)}`, `${A.n} ${op} ${B.n} = ${raw.n}, entonces ${fs(raw)}`),
      simpler
        ? Bi(`Simplify by dividing by ${g}: ${fs(raw)} = ${fs(ans)}.`, `Make it simpler: divide top and bottom by ${g} → ${fs(ans)}.`,
            `Simplifica al dividir entre ${g}: ${fs(raw)} = ${fs(ans)}.`, `Hazlo más simple: divide arriba y abajo entre ${g} → ${fs(ans)}.`)
        : Bi(`${fs(ans)} is already in simplest form.`, `${fs(ans)} can't be made simpler.`,
            `${fs(ans)} ya está en su forma simplificada.`, `${fs(ans)} no se puede simplificar más.`),
    ],
  };
}

function genCompare(r: () => number): Omit<Problem, 'id' | 'skill'> {
  const dens = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  let a = properFrac(r, dens), b: Frac;
  if (r() < 0.2) {
    const k = int(r, 2, 4); b = { n: a.n * k, d: a.d * k };
  } else {
    b = properFrac(r, dens);
    for (let i = 0; i < 30 && (b.d === a.d || fracEq(a, b)); i++) b = properFrac(r, dens);
  }
  if (r() < 0.5) [a, b] = [b, a];
  const rel = cmp(a, b);
  const L = lcm(a.d, b.d);
  const A = { n: a.n * (L / a.d), d: L }, B = { n: b.n * (L / b.d), d: L };
  const relWord = { '<': 'is less than', '>': 'is greater than', '=': 'is equal to' }[rel];
  const relWordEs = { '<': 'es menor que', '>': 'es mayor que', '=': 'es igual a' }[rel];
  return {
    parts: [a, { blank: true }, b],
    prompt: Bi(
      `Compare the fractions. Choose <, >, or =`,
      `Which is bigger? Pick less than, greater than, or equal`,
      `Compara las fracciones. Elige <, > o =`,
      `¿Cuál es mayor? Elige menor que, mayor que o igual`,
    ),
    speech: { en: `Compare ${say(a)} and ${say(b)}`, es: `Compara ${sayEs(a)} y ${sayEs(b)}` },
    answer: { kind: 'cmp', value: rel },
    bars: [a, b],
    hints: [
      Bi(`It's hard to compare different denominators. Rewrite both with a common denominator.`,
        `The bottom numbers are different, so make them the same first.`,
        `Es difícil comparar denominadores distintos. Reescribe ambas fracciones con un denominador común.`,
        `Los números de abajo son diferentes, así que primero hazlos iguales.`),
      Bi(`Use ${L}: ${fs(a)} = ${fs(A)} and ${fs(b)} = ${fs(B)}.`,
        `With ${L} on the bottom: ${fs(a)} is ${fs(A)}, and ${fs(b)} is ${fs(B)}.`,
        `Usa ${L}: ${fs(a)} = ${fs(A)} y ${fs(b)} = ${fs(B)}.`,
        `Con ${L} abajo: ${fs(a)} es ${fs(A)}, y ${fs(b)} es ${fs(B)}.`),
      Bi(`Now compare the numerators ${A.n} and ${B.n}.`,
        `Now just look at the top numbers: ${A.n} and ${B.n}. Which is bigger?`,
        `Ahora compara los numeradores ${A.n} y ${B.n}.`,
        `Ahora mira solo los números de arriba: ${A.n} y ${B.n}. ¿Cuál es mayor?`),
    ],
    steps: [
      Bi(`Common denominator: ${L}.`, `Same bottom number: ${L}.`,
        `Denominador común: ${L}.`, `El mismo número de abajo: ${L}.`),
      Bi(`${fs(a)} = ${fs(A)}, ${fs(b)} = ${fs(B)}.`, `${fs(a)} → ${fs(A)}; ${fs(b)} → ${fs(B)}.`,
        `${fs(a)} = ${fs(A)}, ${fs(b)} = ${fs(B)}.`, `${fs(a)} → ${fs(A)}; ${fs(b)} → ${fs(B)}.`),
      Bi(`${A.n} ${rel} ${B.n}, so ${fs(a)} ${rel} ${fs(b)} (${fs(a)} ${relWord} ${fs(b)}).`,
        `${A.n} ${rel} ${B.n}, so ${fs(a)} ${relWord} ${fs(b)}.`,
        `${A.n} ${rel} ${B.n}, entonces ${fs(a)} ${rel} ${fs(b)} (${fs(a)} ${relWordEs} ${fs(b)}).`,
        `${A.n} ${rel} ${B.n}, entonces ${fs(a)} ${relWordEs} ${fs(b)}.`),
    ],
  };
}

const PURPOSE_ID: Record<Purpose, number> = { practice: 1, pre: 2, post: 3 };
const SKILL_ID: Record<Skill, number> = { equiv: 1, addsub: 2, compare: 3 };

export function generate(skill: Skill, seed: number, index: number, purpose: Purpose = 'practice'): Problem {
  const r = rng(mix(seed, SKILL_ID[skill], index, PURPOSE_ID[purpose]));
  const body = skill === 'equiv' ? genEquiv(r) : skill === 'addsub' ? genAddSub(r) : genCompare(r);
  return { id: `${purpose}-${skill}-${seed}-${index}`, skill, ...body };
}

/** The 2-question pre/post check: equivalent fractions, then add/subtract. Post uses the same skills with new numbers. */
export const CHECK_LEN = 2;
export const CHECK_SKILLS: Skill[] = ['equiv', 'addsub'];
export function checkProblem(seed: number, i: number, purpose: 'pre' | 'post'): Problem {
  const k = Math.max(0, Math.min(CHECK_SKILLS.length - 1, i));
  return generate(CHECK_SKILLS[k], seed, 0, purpose);
}

export type Grade = { correct: boolean; simplestNote?: Frac; invalid?: string };

export function grade(p: Problem, input: { int?: string; n?: string; d?: string; cmp?: string }): Grade {
  const parseIntStrict = (s?: string) => (s && /^\s*-?\d+\s*$/.test(s) ? parseInt(s, 10) : NaN);
  const a = p.answer;
  if (a.kind === 'int') {
    const v = parseIntStrict(input.int);
    if (Number.isNaN(v)) return { correct: false, invalid: 'Enter a whole number.' };
    return { correct: v === a.value };
  }
  if (a.kind === 'cmp') {
    if (!input.cmp) return { correct: false, invalid: 'Choose <, >, or =.' };
    return { correct: input.cmp === a.value };
  }
  const n = parseIntStrict(input.n), d = parseIntStrict(input.d);
  if (Number.isNaN(n) || Number.isNaN(d)) return { correct: false, invalid: 'Enter a whole number for the top and the bottom.' };
  if (d === 0) return { correct: false, invalid: 'The bottom number cannot be 0.' };
  const ok = fracEq({ n, d }, a.value);
  if (ok && (Math.abs(n) !== a.value.n || Math.abs(d) !== a.value.d)) return { correct: true, simplestNote: a.value };
  return { correct: ok };
}

export function answerText(a: Answer): string {
  if (a.kind === 'int') return String(a.value);
  if (a.kind === 'frac') return fs(a.value);
  return a.value;
}
