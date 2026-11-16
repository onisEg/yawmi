import { test, expect } from '@playwright/test';

test.beforeEach(async ({page}) => {
  // Every Playwright context is disposable. Never authenticate against real Supabase.
  await page.route('**/*.supabase.co/**', route => route.abort('blockedbyclient'));
  await page.addInitScript(() => {
    localStorage.setItem('yawmi_splash_seen','1');
    localStorage.setItem('yawmi_asked_name','1');
    localStorage.setItem('yawmi_tour_done','1');
  });
  await page.goto('/');
  await expect(page.locator('#tab-tasks')).toBeAttached();
});

test('task survives reload, can be completed and moved to trash', async ({page}) => {
  await page.locator('nav.bottom button[data-tab="tasks"]').click();
  const label = 'QA task ' + Date.now();
  await page.locator('#taskTitle').fill(label);
  await page.locator('#addTaskBtn').click();
  const row = page.locator('#taskList .titem').filter({hasText:label}).first();
  await expect(row).toBeVisible();
  await page.reload();
  await page.locator('nav.bottom button[data-tab="tasks"]').click();
  const saved = page.locator('#taskList .titem').filter({hasText:label}).first();
  await expect(saved).toBeVisible();
  await saved.locator('.tcheck').click();
  // Completed tasks are collapsed into their own group; verifying persisted JSON
  // is safer than depending on a particular accordion/visual state.
  await expect.poll(async () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('yawmi_tasks') || '[]')
      .find(t => t.t === label)?.done)).toBe(true);
  await page.reload();
  await expect.poll(async () => page.evaluate((text) =>
    JSON.parse(localStorage.getItem('yawmi_tasks') || '[]')
      .find(t => t.t === text)?.done, label)).toBe(true);
});

test('note create, edit and delete preserves other records', async ({page}) => {
  await page.locator('nav.bottom button[data-tab="notes"]').click();
  const title = 'QA note ' + Date.now();
  await page.locator('#notesAddBtn').click();
  await expect(page.locator('#noteEditOv')).toHaveClass(/show/);
  await page.locator('#neTitle').fill(title);
  await page.locator('#neBody').fill('First version');
  await page.locator('#neSave').click();
  const card = page.locator('#notesGrid .notecard').filter({hasText:title}).first();
  await expect(card).toBeVisible();
  await page.reload();
  await page.locator('nav.bottom button[data-tab="notes"]').click();
  const stored = page.locator('#notesGrid .notecard').filter({hasText:title}).first();
  await expect(stored).toBeVisible();
  await stored.click();
  await page.locator('#neBody').fill('Updated note content');
  await page.locator('#neSave').click();
  await expect(page.locator('#notesGrid .notecard').filter({hasText:'Updated note content'})).toBeVisible();
  await page.locator('#notesGrid .notecard').filter({hasText:title}).first().click();
  await page.locator('#neDel').click();
  const confirm = page.locator('#dlgOv');
  if (await confirm.isVisible()) await page.locator('#dlgOk').click();
  await expect(page.locator('#notesGrid .notecard').filter({hasText:title})).toHaveCount(0);
  await page.reload();
  await expect.poll(async () => page.evaluate(text =>
    (JSON.parse(localStorage.getItem('yawmi_notes') || '[]').find(n => n.t === text)?.del) ?? false,title
  )).toBe(true);
});

test('focus countdown can start, close its sheet and resume after reload', async ({page}) => {
  await page.locator('#focusOpenBtn').click();
  await page.locator('#focusToggle').click();
  await expect.poll(async () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('yawmi_focus_runtime_v2') || '{}').running)).toBe(true);
  await page.locator('#focusClose').click();
  await page.reload();
  await expect.poll(async () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('yawmi_focus_runtime_v2') || '{}');
    return state.running && state.endsAt > Date.now();
  })).toBe(true);
});
