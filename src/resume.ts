// Resume codes: compact, human-typable progress codes with a typo-detecting checksum.
//
// HONEST SECURITY NOTE: this is an *integrity checksum*, not a signature. It reliably
// catches typos, single wrong characters, swapped neighbours and corrupted scans. It
// does NOT stop someone from deliberately crafting a code: the algorithm ships in the
// page, and any key we embedded in client code could be read too. That's acceptable
// because the code only drives self-practice; it isn't a grade or a credential.
// Codes contain no personal data: just a random 16-bit problem seed and counters.

export interface SkillProgress { correct: number; attempts: number }
export interface Progress {
  seed: number;          // 0..65535, picks which generated problems you see
  stage: number;         // 0 new, 1 practising, 2 post-check, 3 finished
  preCount: number;      // 0..6 answered in pre-check
  preMask: number;       // 6 bits, bit i = question i correct
  postCount: number;
  postMask: number;
  skills: [SkillProgress, SkillProgress, SkillProgress]; // equiv, addsub, compare
  hints: number;         // hints viewed, capped at 63
}

export const VERSION = 1;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)
const DATA_BITS = 80; // 16 symbols
const CRC_BITS = 10;  // 2 symbols
export const CODE_LEN = (DATA_BITS + CRC_BITS) / 5; // 18

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(v) || 0));

export function newProgress(seed = Math.floor(Math.random() * 65536)): Progress {
  return {
    seed: seed & 0xffff, stage: 0, preCount: 0, preMask: 0, postCount: 0, postMask: 0,
    skills: [{ correct: 0, attempts: 0 }, { correct: 0, attempts: 0 }, { correct: 0, attempts: 0 }], hints: 0,
  };
}

/** Clamp to what the code can represent (counters saturate rather than wrap). */
export function normalize(p: Progress): Progress {
  const skills = p.skills.map((s) => {
    const attempts = clamp(s.attempts, 0, 63);
    return { attempts, correct: clamp(s.correct, 0, Math.min(31, attempts)) };
  }) as Progress['skills'];
  const preCount = clamp(p.preCount, 0, 6), postCount = clamp(p.postCount, 0, 6);
  return {
    seed: clamp(p.seed, 0, 65535), stage: clamp(p.stage, 0, 3),
    preCount, preMask: p.preMask & ((1 << preCount) - 1),
    postCount, postMask: p.postMask & ((1 << postCount) - 1),
    skills, hints: clamp(p.hints, 0, 63),
  };
}

/** CRC-10 (poly x^10+x^9+x^5+x^4+x+1 = 0x233). Detects every error burst of <=10 bits,
 *  so every single wrong symbol (5 bits) and every swap of two adjacent symbols. */
export function crc10(bits: number[]): number {
  let reg = 0;
  for (const b of bits) {
    const top = ((reg >> 9) & 1) ^ b;
    reg = (reg << 1) & 0x3ff;
    if (top) reg ^= 0x233;
  }
  return reg;
}

function pushBits(out: number[], value: number, width: number) {
  for (let i = width - 1; i >= 0; i--) out.push((value >>> i) & 1);
}
function readBits(bits: number[], pos: { i: number }, width: number) {
  let v = 0;
  for (let k = 0; k < width; k++) v = v * 2 + bits[pos.i++];
  return v;
}

export function encode(progress: Progress): string {
  const p = normalize(progress);
  const bits: number[] = [];
  pushBits(bits, VERSION, 3);
  pushBits(bits, p.seed, 16);
  pushBits(bits, p.stage, 2);
  pushBits(bits, p.preCount, 3); pushBits(bits, p.preMask, 6);
  pushBits(bits, p.postCount, 3); pushBits(bits, p.postMask, 6);
  for (const s of p.skills) { pushBits(bits, s.correct, 5); pushBits(bits, s.attempts, 6); }
  pushBits(bits, p.hints, 6);
  while (bits.length < DATA_BITS) bits.push(0);
  pushBits(bits, crc10(bits), CRC_BITS);
  let s = '';
  for (let i = 0; i < bits.length; i += 5) s += ALPHABET[readBits(bits, { i }, 5)];
  return format(s);
}

export const format = (s: string) => s.match(/.{1,6}/g)!.join('-');

/** Accept lowercase, spaces/hyphens, and the usual look-alikes (O→0, I/L→1). */
export function normalizeInput(raw: string): string {
  return raw.toUpperCase().replace(/[\s\-_.]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
}

export type DecodeResult = { ok: true; progress: Progress } | { ok: false; error: string };

export function decode(raw: string): DecodeResult {
  const s = normalizeInput(raw);
  if (s.length !== CODE_LEN) return { ok: false, error: `A resume code has ${CODE_LEN} letters and numbers. This one has ${s.length}.` };
  const bits: number[] = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return { ok: false, error: `"${ch}" isn't used in resume codes. Check for a typo.` };
    pushBits(bits, v, 5);
  }
  const data = bits.slice(0, DATA_BITS);
  const crc = readBits(bits, { i: DATA_BITS }, CRC_BITS);
  if (crc10(data) !== crc) return { ok: false, error: 'This code has a typo somewhere (the check letters don\'t match). Please compare it carefully.' };
  const pos = { i: 0 };
  const version = readBits(data, pos, 3);
  if (version !== VERSION) return { ok: false, error: 'This code is from a different version of the app.' };
  const p: Progress = {
    seed: readBits(data, pos, 16), stage: readBits(data, pos, 2),
    preCount: readBits(data, pos, 3), preMask: readBits(data, pos, 6),
    postCount: readBits(data, pos, 3), postMask: readBits(data, pos, 6),
    skills: [0, 1, 2].map(() => ({ correct: readBits(data, pos, 5), attempts: readBits(data, pos, 6) })) as Progress['skills'],
    hints: readBits(data, pos, 6),
  };
  const n = normalize(p);
  if (!same(n, p) || data.slice(pos.i).some((b) => b)) {
    return { ok: false, error: 'This code passed the typo check but contains impossible values.' };
  }
  return { ok: true, progress: p };
}

function same(a: Progress, b: Progress): boolean {
  const flat = (p: Progress) => [p.seed, p.stage, p.preCount, p.preMask, p.postCount, p.postMask, p.hints,
    ...p.skills.flatMap((s) => [s.correct, s.attempts])].join(',');
  return flat(a) === flat(b);
}
