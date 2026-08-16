import { expect, test } from '@playwright/test';

test('a member can create, update, reload, and delete a game record', async ({ page }, testInfo) => {
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
  const email = `record-e2e-${runId}@example.com`;
  const nickname = `record-e2e-${runId}`;
  const opponentName = `opponent-${runId}`;
  const editedOpponentName = `edited-${runId}`;
  const password = 'playwright-password-123';

  await page.goto('/signup');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('닉네임').fill(nickname);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill(password);
  await page.getByRole('button', { name: '가입하고 시작하기' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole('link', { name: '경기 기록', exact: true }).click();
  await expect(page).toHaveURL(/\/records$/);
  await expect(page.getByRole('heading', { name: '경기 기록', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '경기 기록 추가', exact: true }).click();
  const addDialog = page.getByRole('dialog', { name: '경기 기록 추가' });
  await addDialog.getByLabel('상대 닉네임').fill(opponentName);
  await addDialog.getByLabel('내 점수').fill('12');
  await addDialog.getByLabel('상대 점수').fill('7');
  await addDialog.getByLabel('이닝 수').fill('8');
  await addDialog.getByLabel('하이런').fill('3');
  await addDialog.getByLabel('메모').fill('E2E 생성 기록');
  await addDialog.getByRole('button', { name: '기록 저장하기' }).click();

  const createdRecord = page.getByRole('button', { name: `경기 기록 보기: ${opponentName}` });
  await expect(createdRecord).toBeVisible();
  await createdRecord.click();
  await expect(page.getByRole('heading', { name: '경기 상세 내용' })).toBeVisible();

  await page.getByRole('button', { name: '경기 기록 수정' }).click();
  const editDialog = page.getByRole('dialog', { name: '경기 기록 수정' });
  await editDialog.getByLabel('상대 이름').fill(editedOpponentName);
  await editDialog.getByLabel('내 점수').fill('14');
  await editDialog.getByLabel('상대 점수').fill('9');
  await editDialog.getByLabel('이닝', { exact: true }).fill('4');
  await editDialog.getByLabel('하이런').fill('5');
  await editDialog.getByLabel('이닝별 점수').fill('4, 3, 2, 5');
  await editDialog.getByLabel('메모').fill('E2E 수정 기록');
  await editDialog.getByRole('button', { name: '수정 저장' }).click();

  const updatedRecord = page.getByRole('button', { name: `경기 기록 보기: ${editedOpponentName}` });
  await expect(updatedRecord).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/records$/);
  await expect(updatedRecord).toBeVisible();
  await updatedRecord.click();
  const detailDialog = page.getByRole('dialog', { name: '경기 상세 내용' });
  await expect(detailDialog.getByText('14 : 9', { exact: true })).toBeVisible();

  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    await dialog.accept();
  });
  await page.getByRole('button', { name: '경기 기록 삭제' }).click();
  await expect(updatedRecord).toHaveCount(0);

  await page.reload();
  await expect(updatedRecord).toHaveCount(0);
  expect(browserErrors).toEqual([]);
});
