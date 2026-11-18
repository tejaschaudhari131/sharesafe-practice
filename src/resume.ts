// Resume codes: compact, human-typable progress codes with a typo-detecting checksum.
//
// Version 2 adds a 10-bit pack hash so a code restores the same lesson pack.
//
// HONEST SECURITY NOTE: this is an *integrity checksum*, not a signature. It reliably
// catches typos, single wrong characters, swapped neighbours and corrupted scans. It
// does NOT stop someone from deliberately crafting a code: the algorithm ships in the
// page, and any key we embedded in client code could be read too. That's acceptable
// because the code only drives self-practice; it isn't a grade or a credential.
// Codes contain no personal data: just a pack hash, a random problem seed and counters.

import { BUILTIN_IDS, packHash, type BuiltinId } from './pack';

export interface SkillProgress { correct: number; attempts: number }
export interface Progress {
  packHash: number;    // 0..1023, identifies the lesson pack
  seed: number;        // 0..16383, picks which generated problems you see
  stage: number;       // 0 new, 1 practising, 2 post-check, 3 finished
  preCount: number;    // 0..6 answered in pre-check
  preMask: number;     // 6 bits, bit i = question i correct
  postCount: number;
  postMask: number;
  skills: [SkillProgress, SkillProgress, SkillProgress];
  hints: number;       // hints viewed, capped at 31
}

export const VERSION = 2;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)
const DATA_BITS = 80; // 16 symbols
const CRC_BITS = 10;  // 2 symbols
export const CODE_LEN = (DATA_BITS + CRC_BITS) / 5; // 18

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.floor(v) || 0));

export function newProgress(packHash = 0, seed = Math.floor(Math.random() * 16384)): Progress {
  return {
    packHash: packHash & 0x3ff, seed: seed & 0x3fff, stage: 0, preCount: 0, preMask: 0, postCount: 0, postMask: 0,
    skills: [{ correct: 0, attempts: 0 }, { correct: 0, attempts: 0 }, { correct: 0, attempts: 0 }], hints: 0,
  };
}

/** Clamp to what the code can represent (counters saturate rather than wrap). */
export function normalize(p: Progress): Progress {
  const skills = p.skills.map((s) => {
    const attempts = clamp(s.attempts, 0, 31);
    return { attempts, correct: clamp(s.correct, 0, Math.min(15, attempts)) };
  }) as Progress['skills'];
  const preCount = clamp(p.preCount, 0, 6), postCount = clamp(p.postCount, 0, 6);
  return {
    packHash: clamp(p.packHash, 0, 1023),
    seed: clamp(p.seed, 0, 16383), stage: clamp(p.stage, 0, 3),
    preCount, preMask: p.preMask & ((1 << preCount) - 1),
    postCount, postMask: p.postMask & ((1 << postCount) - 1),
    skills, hints: clamp(p.hints, 0, 31),
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
  pushBits(bits, p.packHash, 10);
  pushBits(bits, p.seed, 14);
  pushBits(bits, p.stage, 2);
  pushBits(bits, p.preCount, 3); pushBits(bits, p.preMask, 6);
  pushBits(bits, p.postCount, 3); pushBits(bits, p.postMask, 6);
  for (const s of p.skills) { pushBits(bits, s.correct, 4); pushBits(bits, s.attempts, 5); }
  pushBits(bits, p.hints, 5);
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
  if (s.length !== CODE_LEN) return { ok: false, error: `len:${s.length}` };
  const bits: number[] = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) return { ok: false, error: `char:${ch}` };
    pushBits(bits, v, 5);
  }
  const data = bits.slice(0, DATA_BITS);
  const crc = readBits(bits, { i: DATA_BITS }, CRC_BITS);
  if (crc10(data) !== crc) return { ok: false, error: 'typo' };
  const pos = { i: 0 };
  const version = readBits(data, pos, 3);
  if (version !== VERSION) return { ok: false, error: 'version' };
  const p: Progress = {
    packHash: readBits(data, pos, 10),
    seed: readBits(data, pos, 14), stage: readBits(data, pos, 2),
    preCount: readBits(data, pos, 3), preMask: readBits(data, pos, 6),
    postCount: readBits(data, pos, 3), postMask: readBits(data, pos, 6),
    skills: [0, 1, 2].map(() => ({ correct: readBits(data, pos, 4), attempts: readBits(data, pos, 5) })) as Progress['skills'],
    hints: readBits(data, pos, 5),
  };
  const n = normalize(p);
  if (!same(n, p) || data.slice(pos.i).some((b) => b)) {
    return { ok: false, error: 'impossible' };
  }
  return { ok: true, progress: p };
}

function same(a: Progress, b: Progress): boolean {
  const flat = (p: Progress) => [p.packHash, p.seed, p.stage, p.preCount, p.preMask, p.postCount, p.postMask, p.hints,
    ...p.skills.flatMap((s) => [s.correct, s.attempts])].join(',');
  return flat(a) === flat(b);
}


export function bitCount(mask: number): number {
  let c = 0;
  let m = mask >>> 0;
  while (m) { c += m & 1; m >>= 1; }
  return c;
}

export interface CodeSummary {
  packHash: number;
  pre: number;
  post: number;
  preCount: number;
  postCount: number;
  stage: number;
}

export function summarize(progress: Progress): CodeSummary {
  const p = normalize(progress);
  return {
    packHash: p.packHash,
    pre: bitCount(p.preMask),
    post: bitCount(p.postMask),
    preCount: p.preCount,
    postCount: p.postCount,
    stage: p.stage,
  };
}

/** Known built-in pack ids from a 10-bit pack hash (built-in hashes are of the id only). */
export function builtinIdFromHash(hash: number): BuiltinId | null {
  for (const id of BUILTIN_IDS) {
    if (packHash({ id }) === (hash & 0x3ff)) return id;
  }
  return null;
}
