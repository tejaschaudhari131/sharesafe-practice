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

export interface Problem {
  id: string;
  skill: Skill;
  /** Parts of the question: strings and fractions, rendered in order. */
  parts: Array<string | FracSlot | { blank: true }>;
  prompt: Text;
  speech: string;
  answer: Answer;
  hints: Text[];
  steps: Text[];
  /** Optional visual model for hint 1: fraction bars to draw. */
  bars?: Frac[];
}

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
      prompt: { std: `Find the missing numerator so the fractions are equivalent`,
                plain: `Fill in the top number so both fractions are the same amount` },
      speech: `${say(base)} equals what over ${big.d}?`,
      answer: { kind: 'int', value: big.n },
      bars: [base, big],
      hints: [
        { std: `Compare the denominators: ${base.d} became ${big.d}. What was ${base.d} multiplied by?`,
          plain: `Look at the bottom numbers. ${base.d} turned into ${big.d}. What did we times ${base.d} by?` },
        { std: `${base.d} × ${k} = ${big.d}, so the multiplier is ${k}.`, plain: `${base.d} times ${k} is ${big.d}. So we times by ${k}.` },
        { std: `Multiply the numerator by the same number: ${base.n} × ${k} = ?`, plain: `Do the same thing to the top: ${base.n} times ${k}.` },
      ],
      steps: [
        { std: `Equivalent fractions: multiply numerator and denominator by the same nonzero number.`, plain: `To make the same amount, times the top and bottom by the same number.` },
        { std: `${base.d} × ${k} = ${big.d}`, plain: `Bottom: ${base.d} × ${k} = ${big.d}` },
        { std: `${base.n} × ${k} = ${big.n}`, plain: `Top: ${base.n} × ${k} = ${big.n}` },
        { std: `So ${fs(base)} = ${fs(big)}.`, plain: `So ${fs(base)} is the same as ${fs(big)}.` },
      ],
    };
  }
  return {
    parts: [base, '=', { n: big.n, d: '?' }],
    prompt: { std: `Find the missing denominator so the fractions are equivalent`,
              plain: `Fill in the bottom number so both fractions are the same amount` },
    speech: `${say(base)} equals ${big.n} over what?`,
    answer: { kind: 'int', value: big.d },
    bars: [base, big],
    hints: [
      { std: `Compare the numerators: ${base.n} became ${big.n}. What was ${base.n} multiplied by?`,
        plain: `Look at the top numbers. ${base.n} turned into ${big.n}. What did we times ${base.n} by?` },
      { std: `${base.n} × ${k} = ${big.n}, so the multiplier is ${k}.`, plain: `${base.n} times ${k} is ${big.n}. So we times by ${k}.` },
      { std: `Multiply the denominator by the same number: ${base.d} × ${k} = ?`, plain: `Do the same thing to the bottom: ${base.d} times ${k}.` },
    ],
    steps: [
      { std: `Equivalent fractions: multiply numerator and denominator by the same nonzero number.`, plain: `To make the same amount, times the top and bottom by the same number.` },
      { std: `${base.n} × ${k} = ${big.n}`, plain: `Top: ${base.n} × ${k} = ${big.n}` },
      { std: `${base.d} × ${k} = ${big.d}`, plain: `Bottom: ${base.d} × ${k} = ${big.d}` },
      { std: `So ${fs(base)} = ${fs(big)}.`, plain: `So ${fs(base)} is the same as ${fs(big)}.` },
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
  const opWord = add ? 'Add' : 'Subtract';
  const simpler = ans.d !== raw.d;
  return {
    parts: [a, op, b, '=', { blank: true }],
    prompt: { std: `${opWord}. Write the answer as a fraction (simplest form preferred)`,
              plain: `${add ? 'Add' : 'Take away'}. Type the top number and the bottom number of your answer.` },
    speech: `${say(a)} ${word} ${say(b)}`,
    answer: { kind: 'frac', value: ans },
    bars: [a, b],
    hints: [
      { std: `The denominators (${a.d} and ${b.d}) are different. Find a common denominator: the least common multiple of ${a.d} and ${b.d}.`,
        plain: `The bottom numbers (${a.d} and ${b.d}) are not the same. Find the smallest number both ${a.d} and ${b.d} go into.` },
      { std: `The LCD is ${L}. Rewrite: ${fs(a)} = ${fs(A)} and ${fs(b)} = ${fs(B)}.`,
        plain: `Use ${L} as the bottom. ${fs(a)} becomes ${fs(A)}. ${fs(b)} becomes ${fs(B)}.` },
      { std: `Now ${add ? 'add' : 'subtract'} the numerators and keep the denominator: ${A.n} ${op} ${B.n} = ${raw.n}, over ${L}.`,
        plain: `Now ${add ? 'add' : 'take away'} only the top numbers: ${A.n} ${op} ${B.n}. Keep ${L} on the bottom.` },
    ],
    steps: [
      { std: `LCD of ${a.d} and ${b.d} is ${L}.`, plain: `The shared bottom number is ${L}.` },
      { std: `${fs(a)} = ${a.n}×${ka} / ${a.d}×${ka} = ${fs(A)}`, plain: `${fs(a)}: times top and bottom by ${ka} → ${fs(A)}` },
      { std: `${fs(b)} = ${b.n}×${kb} / ${b.d}×${kb} = ${fs(B)}`, plain: `${fs(b)}: times top and bottom by ${kb} → ${fs(B)}` },
      { std: `${fs(A)} ${op} ${fs(B)} = ${fs(raw)}`, plain: `${A.n} ${op} ${B.n} = ${raw.n}, so ${fs(raw)}` },
      simpler
        ? { std: `Simplify by dividing by ${raw.d / ans.d}: ${fs(raw)} = ${fs(ans)}.`, plain: `Make it simpler: divide top and bottom by ${raw.d / ans.d} → ${fs(ans)}.` }
        : { std: `${fs(ans)} is already in simplest form.`, plain: `${fs(ans)} can't be made simpler.` },
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
  return {
    parts: [a, { blank: true }, b],
    prompt: { std: `Compare the fractions. Choose <, >, or =`,
              plain: `Which is bigger? Pick less than, greater than, or equal` },
    speech: `Compare ${say(a)} and ${say(b)}`,
    answer: { kind: 'cmp', value: rel },
    bars: [a, b],
    hints: [
      { std: `It's hard to compare different denominators. Rewrite both with a common denominator.`,
        plain: `The bottom numbers are different, so make them the same first.` },
      { std: `Use ${L}: ${fs(a)} = ${fs(A)} and ${fs(b)} = ${fs(B)}.`, plain: `With ${L} on the bottom: ${fs(a)} is ${fs(A)}, and ${fs(b)} is ${fs(B)}.` },
      { std: `Now compare the numerators ${A.n} and ${B.n}.`, plain: `Now just look at the top numbers: ${A.n} and ${B.n}. Which is bigger?` },
    ],
    steps: [
      { std: `Common denominator: ${L}.`, plain: `Same bottom number: ${L}.` },
      { std: `${fs(a)} = ${fs(A)}, ${fs(b)} = ${fs(B)}.`, plain: `${fs(a)} → ${fs(A)}; ${fs(b)} → ${fs(B)}.` },
      { std: `${A.n} ${rel} ${B.n}, so ${fs(a)} ${rel} ${fs(b)} (${fs(a)} ${relWord} ${fs(b)}).`,
        plain: `${A.n} ${rel} ${B.n}, so ${fs(a)} ${relWord} ${fs(b)}.` },
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

/** The 6-question pre/post check: 2 of each skill, interleaved. */
export const CHECK_LEN = 6;
export function checkProblem(seed: number, i: number, purpose: 'pre' | 'post'): Problem {
  return generate(SKILLS[i % 3], seed, Math.floor(i / 3), purpose);
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
