import { describe, expect, it } from 'vitest';
import { gradeItem } from '../../src/grade';
import { CATALOG, decodePackHash, packHash, packUrl, validatePack } from '../../src/pack';
import { pack as permission } from '../../src/packs/permission';
import { pack as scam } from '../../src/packs/scam';
import { pack as fractions } from '../../src/packs/fractions-pack';

describe('built-in packs', () => {
  it('have unique 10-bit hashes', () => {
    const hashes = [permission, scam, fractions].map((p) => packHash(p));
    expect(new Set(hashes).size).toBe(3);
    expect(hashes.every((h) => h >= 0 && h <= 1023)).toBe(true);
  });

  for (const p of [permission, scam]) {
    it(`${p.id}: pre and post have 6 questions, each with one valid answer and an explanation`, () => {
      expect(p.checkLength).toBe(6);
      expect(p.pre).toHaveLength(6);
      expect(p.post).toHaveLength(6);
      for (const item of [...p.pre, ...p.post]) {
        expect(item.kind).toBe('choice');
        expect(item.choices!.length).toBeGreaterThanOrEqual(2);
        expect(item.choices!.some((c) => c.id === item.answer)).toBe(true);
        expect(item.explanation?.en.std).toBeTruthy();
        expect(item.prompt.es?.std).toBeTruthy();
        expect(gradeItem(item, { choice: item.answer }).correct).toBe(true);
        const other = item.choices!.find((c) => c.id !== item.answer)!.id;
        expect(gradeItem(item, { choice: other }).correct).toBe(false);
        expect(gradeItem(item, {}).invalid).toBe('choice');
      }
      expect(p.pre.map((i) => i.prompt.en.std)).not.toEqual(p.post.map((i) => i.prompt.en.std));
    });
  }

  it('Permission to Learn practice is three access files with least-privilege keys', () => {
    expect(permission.practice).toHaveLength(3);
    for (const item of permission.practice as typeof permission.pre) {
      expect(item.kind).toBe('access');
      const a = item.access!;
      expect(a.roles.length).toBeGreaterThan(1);
      expect(gradeItem(item, { access: a.correct }).correct).toBe(true);
      const closed = a.roles.find((r) => a.correct[r] !== 'edit') ?? a.roles[0];
      const tooOpen = { ...a.correct, [closed]: 'edit' as const };
      const g = gradeItem(item, { access: tooOpen });
      expect(g.correct).toBe(false);
    }
    const roster = (permission.practice as typeof permission.pre).find((i) => i.id === 'roster')!;
    expect(gradeItem(roster, { access: { you: 'none', class: 'none', teacher: 'edit', public: 'none' } }).correct).toBe(true);
  });

  it('Spot the Scam practice has two scams and one legitimate notice', () => {
    const items = scam.practice as typeof scam.pre;
    expect(items.map((i) => i.answer).sort()).toEqual(['legit', 'scam', 'scam']);
    for (const item of items) {
      expect(item.kind).toBe('message');
      expect(item.flags!.length).toBeGreaterThanOrEqual(2);
      expect(item.message?.from).toMatch(/\.example/);
    }
  });

  it('every catalog loader returns the pack with the same id', async () => {
    for (const c of CATALOG) {
      const p = await c.load();
      expect(p.id).toBe(c.id);
    }
  });
});

describe('validatePack / URL encoding', () => {
  it('rejects reserved ids and short lists', () => {
    const r = validatePack({ id: 'permission', title: { en: { std: 'X', plain: 'X' } }, description: { en: { std: 'Y', plain: 'Y' } }, checkLength: 1, pre: [], practice: [], post: [] });
    expect(r.ok).toBe(false);
  });

  it('accepts a minimal teacher pack and round-trips in a hash URL', () => {
    const item = (id: string, answer = 'a') => ({
      id, skill: 'general', kind: 'choice',
      prompt: { en: { std: 'Q ' + id, plain: 'Q ' + id } },
      choices: [
        { id: 'a', text: { en: { std: 'A', plain: 'A' } } },
        { id: 'b', text: { en: { std: 'B', plain: 'B' } } },
      ],
      answer,
    });
    const raw = {
      id: 'my-pack', title: { en: { std: 'Mine', plain: 'Mine' } }, description: { en: { std: 'A pack', plain: 'A pack' } },
      checkLength: 1, stageTarget: 1, skills: [{ id: 'general', name: { en: { std: 'Practice', plain: 'Practice' } } }],
      pre: [item('pre1')], practice: [item('pr1')], post: [item('po1', 'b')],
    };
    const v = validatePack(raw);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const url = packUrl('https://example.com', '/', v.pack);
    expect(url.qr).not.toBe('too-big');
    expect(url.jsonBytes).toBeGreaterThan(0);
    const payload = url.url.split('#p=')[1];
    const d = decodePackHash(payload);
    expect(d.ok).toBe(true);
    if (d.ok) expect(d.pack.id).toBe('my-pack');
  });
});
