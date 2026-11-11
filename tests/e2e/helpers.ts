import { expect, type Page } from '@playwright/test';
import { checkProblem, generate, type Problem, type Skill } from '../../src/fractions';
import type { Progress } from '../../src/resume';

export async function getProgress(page: Page): Promise<Progress> {
  return page.evaluate(() => {
    const raw = sessionStorage.getItem('sharesafe:v1') ?? localStorage.getItem('sharesafe:v1');
    return JSON.parse(raw!).progress;
  });
}

/** Press Tab (keyboard only) until the focused element matches `selector`. */
export async function tabTo(page: Page, selector: string, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate((s) => !!document.activeElement?.matches(s), selector)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Could not Tab to ${selector}`);
}

/** Answer the current problem using only the keyboard. */
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

export async function doCheck(page: Page, kind: 'pre' | 'post', correct = 6) {
  for (let i = 0; i < 6; i++) {
    await expect(page.locator('h1')).toContainText(`question ${i + 1} of 6`);
    const prog = await getProgress(page);
    await answerByKeyboard(page, checkProblem(prog.seed, i, kind), i >= correct);
  }
}

export async function currentPracticeProblem(page: Page, skill: Skill) {
  const prog = await getProgress(page);
  const k = ['equiv', 'addsub', 'compare'].indexOf(skill);
  return generate(skill, prog.seed, prog.skills[k].attempts, 'practice');
}
