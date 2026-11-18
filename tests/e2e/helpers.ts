import { expect, type Page } from '@playwright/test';
import { checkProblem, generate, type Problem, type Skill } from '../../src/fractions';
import type { AccessLevel, Item, RoleId } from '../../src/pack';
import type { Progress } from '../../src/resume';
import { pack as permission } from '../../src/packs/permission';
import { pack as scam } from '../../src/packs/scam';

export { permission, scam };

export async function getProgress(page: Page): Promise<Progress> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('sharesafe:v2') ?? localStorage.getItem('sharesafe:v2');
    return JSON.parse(raw!).progress;
  });
}

/** Press Tab (keyboard only) until the focused element matches `selector`. */
export async function tabTo(page: Page, selector: string, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate((s) => !!document.activeElement?.matches(s), selector)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not Tab to ${selector}`);
}

export async function answerChoiceByKeyboard(page: Page, item: Item, wrong = false) {
  const ids = (item.choices ?? []).map((c) => c.id);
  const target = wrong ? ids.find((id) => id !== item.answer)! : item.answer!;
  await tabTo(page, 'input[type=radio]');
  await page.keyboard.press('Space');
  for (let i = 0; i < ids.indexOf(target); i++) await page.keyboard.press('ArrowDown');
  await tabTo(page, '#answer button[type=submit]');
  await page.keyboard.press('Enter');
}

export async function answerAccessByKeyboard(page: Page, item: Item, wrong = false) {
  const roles = item.access!.roles;
  const order: AccessLevel[] = ['none', 'view', 'edit'];
  for (const r of roles) {
    const correct = item.access!.correct[r] as AccessLevel;
    const level: AccessLevel = wrong && r === roles[0] ? (correct === 'none' ? 'edit' : 'none') : correct;
    // Tab only lands on the checked radio (or the first, if none is checked).
    // Arrow keys move within the group.
    await tabTo(page, `input[name="${r}"]`);
    const checked = await page.evaluate((name) => !!document.querySelector(`input[name="${name}"]:checked`), r);
    if (!checked) await page.keyboard.press('Space');
    const current = await page.evaluate(() => (document.activeElement as HTMLInputElement).value);
    const from = order.indexOf(current as AccessLevel);
    const to = order.indexOf(level);
    const steps = (to - from + order.length) % order.length;
    for (let i = 0; i < steps; i++) await page.keyboard.press('ArrowDown');
  }
  await tabTo(page, '#answer button[type=submit]');
  await page.keyboard.press('Enter');
}

/** Answer a fractions problem using only the keyboard. */
export async function answerByKeyboard(page: Page, p: Problem, wrong = false) {
  const a = p.answer;
  if (a.kind === 'int') {
    await tabTo(page, '#a-int'); await page.keyboard.type(String(a.value + (wrong ? 1 : 0)));
    await page.keyboard.press('Enter');
  } else if (a.kind === 'frac') {
    await tabTo(page, '#a-n'); await page.keyboard.type(String(a.value.n + (wrong ? 1 : 0)));
    await page.keyboard.press('Tab'); await page.keyboard.type(String(a.value.d));
    await page.keyboard.press('Enter');
  } else {
    const order = ['<', '>', '='];
    const target = wrong ? order[(order.indexOf(a.value) + 1) % 3] : a.value;
    await tabTo(page, 'input[type=radio]');
    await page.keyboard.press('Space');
    for (let i = 0; i < order.indexOf(target); i++) await page.keyboard.press('ArrowDown');
    await tabTo(page, '#answer button[type=submit]');
    await page.keyboard.press('Enter');
  }
}

export async function startPre(page: Page) {
  await page.locator('button[data-go=start]').click();
  await expect(page.locator('h1')).toContainText(/question 1 of 2|pregunta 1 de 2/, { timeout: 15_000 });
}

export async function doCheck(page: Page, kind: 'pre' | 'post', correct = 2, items: Item[] = permission[kind]) {
  for (let i = 0; i < items.length; i++) {
    await expect(page.locator('h1')).toContainText(`question ${i + 1} of ${items.length}`);
    await answerChoiceByKeyboard(page, items[i], i >= correct);
  }
}

export async function doFracCheck(page: Page, kind: 'pre' | 'post', correct = 2) {
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('h1')).toContainText(`question ${i + 1} of 2`);
    const prog = await getProgress(page);
    await answerByKeyboard(page, checkProblem(prog.seed, i, kind), i >= correct);
  }
}

export async function currentPracticeProblem(page: Page, skill: Skill) {
  const prog = await getProgress(page);
  const k = ['equiv', 'addsub', 'compare'].indexOf(skill);
  return generate(skill, prog.seed, prog.skills[k].attempts, 'practice');
}

export function accessItem(id: string): Item {
  return (permission.practice as Item[]).find((i) => i.id === id)!;
}
