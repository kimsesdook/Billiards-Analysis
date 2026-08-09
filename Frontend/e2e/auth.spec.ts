import { expect, test } from '@playwright/test';

test('a new member can sign up, log out, and log in again', async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(`page: ${error.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      browserErrors.push(`http ${response.status()}: ${response.url()}`);
    }
  });

  const runId = `${Date.now()}-${testInfo.workerIndex}`;
  const email = `e2e-${runId}@example.com`;
  const nickname = `e2e-${runId}`;
  const password = 'playwright-password-123';

  await page.goto('/signup');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('닉네임').fill(nickname);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill(password);
  await page.getByRole('button', { name: '가입하고 시작하기' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '나의 대시보드' })).toBeVisible();

  await expect.poll(() => page.evaluate(() => localStorage.getItem('billiards_auth_session'))).toBeNull();
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '나의 대시보드' })).toBeVisible();

  await page.getByRole('button', { name: new RegExp(nickname) }).click();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인하기' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '나의 대시보드' })).toBeVisible();
  expect(browserErrors).toEqual([]);
});
