import { describe, expect, it } from 'vitest';
import { CODE_LEN, crc10, decode, encode, newProgress, normalize, normalizeInput, type Progress } from '../../src/resume';
import { rng } from '../../src/fractions';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomProgress(r: () => number): Progress {
  const int = (n: number) => Math.floor(r() * n);
  const preCount = int(7), postCount = int(7);
  return normalize({
    seed: int(65536), stage: int(4), preCount, preMask: int(64), postCount, postMask: int(64),
    skills: [0, 1, 2].map(() => { const a = int(64); return { attempts: a, correct: int(Math.min(31, a) + 1) }; }) as Progress['skills'],
    hints: int(64),
  });
}

describe('resume code', () => {
  it('has the documented format', () => {
    const code = encode(newProgress(1));
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}-[0-9A-HJKMNP-TV-Z]{6}-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(code.replace(/-/g, '')).toHaveLength(CODE_LEN);
  });

  it('round-trips 5000 random progress states', () => {
    const r = rng(2026);
    for (let i = 0; i < 5000; i++) {
      const p = randomProgress(r);
      const d = decode(encode(p));
      expect(d.ok).toBe(true);
      if (d.ok) expect(d.progress).toEqual(p);
    }
  });

  it('is forgiving about case, spaces, dashes and look-alike characters', () => {
    const p = randomProgress(rng(5));
    const code = encode(p);
    const messy = ' ' + code.toLowerCase().replace(/-/g, ' ') + ' ';
    expect(decode(messy)).toEqual({ ok: true, progress: p });
    expect(normalizeInput('o-i-l')).toBe('011');
  });

  it('saturates counters instead of wrapping', () => {
    const p = newProgress(9); p.skills[0] = { correct: 500, attempts: 900 }; p.hints = 1000;
    const d = decode(encode(p));
    expect(d.ok && d.progress.skills[0]).toEqual({ correct: 31, attempts: 63 });
    expect(d.ok && d.progress.hints).toBe(63);
  });

  it('detects EVERY single-character substitution (exhaustive over 200 codes)', () => {
    const r = rng(77);
    for (let k = 0; k < 200; k++) {
      const s = encode(randomProgress(r)).replace(/-/g, '');
      for (let i = 0; i < s.length; i++) for (const ch of ALPHABET) {
        if (ch === s[i]) continue;
        expect(decode(s.slice(0, i) + ch + s.slice(i + 1)).ok).toBe(false);
      }
    }
  });

  it('detects EVERY adjacent transposition (exhaustive over 500 codes)', () => {
    const r = rng(78);
    for (let k = 0; k < 500; k++) {
      const s = encode(randomProgress(r)).replace(/-/g, '');
      for (let i = 0; i + 1 < s.length; i++) {
        if (s[i] === s[i + 1]) continue;
        expect(decode(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2)).ok).toBe(false);
      }
    }
  });

  it('rejects wrong length and invalid characters with a helpful message', () => {
    const d1 = decode('ABC'); expect(d1.ok).toBe(false);
    expect(!d1.ok && d1.error).toMatch(/18/);
    const d2 = decode('U'.repeat(18)); expect(!d2.ok && d2.error).toMatch(/isn't used/);
  });

  it('rejects checksum-valid codes with impossible values', () => {
    // Build bits by hand: preCount = 7 (impossible) with a correct CRC.
    const bits: number[] = [];
    const push = (v: number, w: number) => { for (let i = w - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    push(1, 3); push(0, 16); push(0, 2); push(7, 3); push(0, 6); push(0, 3); push(0, 6);
    for (let i = 0; i < 3; i++) { push(0, 5); push(0, 6); } push(0, 6);
    while (bits.length < 80) bits.push(0);
    push(crc10(bits), 10);
    let s = ''; for (let i = 0; i < 90; i += 5) s += ALPHABET[parseInt(bits.slice(i, i + 5).join(''), 2)];
    const d = decode(s);
    expect(d.ok).toBe(false);
    expect(!d.ok && d.error).toMatch(/impossible/);
  });

  it('contains no personal data: the code depends only on the progress fields', () => {
    const p = newProgress(123);
    expect(encode(p)).toBe(encode(JSON.parse(JSON.stringify(p))));
    expect(Object.keys(p).sort()).toEqual(['hints', 'postCount', 'postMask', 'preCount', 'preMask', 'seed', 'skills', 'stage']);
  });
});
