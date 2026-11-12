import { ACCESS_LEVELS, type AccessLevel, type Item, type RoleId } from './pack';

const rank = (l: AccessLevel) => ACCESS_LEVELS.indexOf(l);

export type PackGrade = {
  correct: boolean;
  invalid?: 'choice' | 'roles';
  accessNote?: 'too-open' | 'too-tight' | 'mixed';
};

export function gradeItem(
  item: Item,
  input: { choice?: string; access?: Partial<Record<RoleId, AccessLevel>> },
): PackGrade {
  if (item.kind === 'choice' || item.kind === 'message') {
    if (!input.choice) return { correct: false, invalid: 'choice' };
    return { correct: input.choice === item.answer };
  }
  if (item.kind === 'access' && item.access) {
    const roles = item.access.roles;
    const got = input.access || {};
    if (roles.some((r) => !got[r] || !ACCESS_LEVELS.includes(got[r]!))) {
      return { correct: false, invalid: 'roles' };
    }
    if (roles.every((r) => got[r] === item.access!.correct[r])) return { correct: true };
    let open = false, tight = false;
    for (const r of roles) {
      const g = rank(got[r] as AccessLevel);
      const e = rank(item.access.correct[r] as AccessLevel);
      if (g > e) open = true;
      if (g < e) tight = true;
    }
    return { correct: false, accessNote: open && tight ? 'mixed' : open ? 'too-open' : 'too-tight' };
  }
  return { correct: false };
}
