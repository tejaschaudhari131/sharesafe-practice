import { describe, expect, it } from 'vitest';
import { CHECK_LEN, SKILLS, checkProblem, cmp, fracEq, gcd, generate, grade, lcm, simplify, type Frac } from '../../src/fractions';

const val = (f: Frac) => f.n / f.d;

describe('fraction helpers', () => {
  it('gcd / lcm / simplify', () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(4, 6)).toBe(12);
    expect(simplify({ n: 10, d: 4 })).toEqual({ n: 5, d: 2 });
    expect(fracEq({ n: 1, d: 2 }, { n: 3, d: 6 })).toBe(true);
    expect(cmp({ n: 2, d: 3 }, { n: 3, d: 4 })).toBe('<');
  });
});

describe('problem generation', () => {
  it('is deterministic for a given seed/index', () => {
    for (const s of SKILLS) expect(generate(s, 1234, 5)).toEqual(generate(s, 1234, 5));
  });
  it('varies across indices', () => {
    const ids = new Set(Array.from({ length: 30 }, (_, i) => JSON.stringify(generate('addsub', 7, i).parts)));
    expect(ids.size).toBeGreaterThan(20);
  });

  // Property-style sweep: thousands of problems, check every answer is mathematically right.
  for (const skill of SKILLS) {
    it(`${skill}: answers are correct and well-formed across 3000 problems`, () => {
      for (let seed = 0; seed < 100; seed++) for (let i = 0; i < 30; i++) {
        const p = generate(skill, seed * 653, i);
        expect(p.hints.length).toBe(3);
        expect(p.steps.length).toBeGreaterThanOrEqual(3);
        const fracs = p.parts.filter((x): x is Frac => typeof x === 'object' && 'n' in x && typeof x.n === 'number' && typeof x.d === 'number');
        for (const f of fracs) { expect(f.d).toBeGreaterThan(1); expect(f.n).toBeGreaterThan(0); }
        if (skill === 'equiv') {
          expect(p.answer.kind).toBe('int');
          const [base, , slot] = p.parts as [Frac, string, { n: number | '?'; d: number | '?' }];
          const full = slot.n === '?' ? { n: (p.answer as { value: number }).value, d: slot.d as number } : { n: slot.n as number, d: (p.answer as { value: number }).value };
          expect(fracEq(base, full)).toBe(true);
          expect(full.d).toBeGreaterThan(base.d);
        } else if (skill === 'addsub') {
          const [a, op, b] = p.parts as [Frac, string, Frac];
          expect(a.d).not.toBe(b.d); // unlike denominators, as in OpenStax 4.6
          const ans = (p.answer as { value: Frac }).value;
          const expected = op === '+' ? val(a) + val(b) : val(a) - val(b);
          expect(val(ans)).toBeCloseTo(expected, 10);
          expect(val(ans)).toBeGreaterThan(0);
          expect(simplify(ans)).toEqual(ans);
        } else {
          const [a, , b] = p.parts as [Frac, unknown, Frac];
          expect((p.answer as { value: string }).value).toBe(cmp(a, b));
        }
      }
    });
  }

  it('compare problems include all three outcomes', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add((generate('compare', 99, i).answer as { value: string }).value);
    expect(seen).toEqual(new Set(['<', '>', '=']));
  });

  it('pre and post checks have 2 of each skill and differ from each other', () => {
    const pre = Array.from({ length: CHECK_LEN }, (_, i) => checkProblem(42, i, 'pre'));
    const post = Array.from({ length: CHECK_LEN }, (_, i) => checkProblem(42, i, 'post'));
    for (const s of SKILLS) expect(pre.filter((p) => p.skill === s)).toHaveLength(2);
    expect(pre.map((p) => JSON.stringify(p.parts))).not.toEqual(post.map((p) => JSON.stringify(p.parts)));
  });
});

describe('grading', () => {
  const add = generate('addsub', 1, 0);
  const ans = (add.answer as { value: Frac }).value;
  it('accepts the exact answer', () => expect(grade(add, { n: String(ans.n), d: String(ans.d) })).toEqual({ correct: true }));
  it('accepts an equivalent unsimplified answer with a note', () => {
    const g = grade(add, { n: String(ans.n * 3), d: String(ans.d * 3) });
    expect(g.correct).toBe(true); expect(g.simplestNote).toEqual(ans);
  });
  it('rejects wrong / invalid input', () => {
    expect(grade(add, { n: String(ans.n + 1), d: String(ans.d) }).correct).toBe(false);
    expect(grade(add, { n: '1', d: '0' }).invalid).toMatch(/cannot be 0/);
    expect(grade(add, { n: 'x', d: '2' }).invalid).toBeTruthy();
  });
  it('grades int and compare answers', () => {
    const e = generate('equiv', 3, 1); const c = generate('compare', 3, 1);
    expect(grade(e, { int: String((e.answer as { value: number }).value) }).correct).toBe(true);
    expect(grade(e, { int: '2.5' }).invalid).toBeTruthy();
    expect(grade(c, { cmp: (c.answer as { value: string }).value }).correct).toBe(true);
    expect(grade(c, {}).invalid).toBeTruthy();
  });
});
