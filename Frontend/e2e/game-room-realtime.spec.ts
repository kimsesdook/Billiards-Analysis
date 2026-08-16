import { expect, test, type Page } from '@playwright/test';

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      const source = location.url ? ` (${location.url}:${location.lineNumber})` : '';
      errors.push(`console: ${message.text()}${source}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`page: ${error.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`http ${response.status()}: ${response.url()}`);
    }
  });

  return errors;
}

async function signUp(page: Page, email: string, nickname: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('닉네임').fill(nickname);
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByLabel('비밀번호 확인', { exact: true }).fill(password);

  const notificationTicket = page.waitForResponse((response) => (
    response.url().includes('/api/notifications/websocket-ticket') && response.ok()
  ));
  await page.getByRole('button', { name: '가입하고 시작하기' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: '나의 대시보드' })).toBeVisible();
  await notificationTicket;
}

test('two friends can complete a realtime game room match', async ({ browser }, testInfo) => {
  test.setTimeout(360_000);

  const baseURL = testInfo.project.use.baseURL as string;
  const hostContext = await browser.newContext({ baseURL });
  const guestContext = await browser.newContext({ baseURL });
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const hostErrors = collectBrowserErrors(hostPage);
  const guestErrors = collectBrowserErrors(guestPage);

  const runId = `${Date.now().toString().slice(-10)}${testInfo.workerIndex}`;
  const hostNickname = `host-${runId}`;
  const guestNickname = `guest-${runId}`;
  const password = 'playwright-password-123';

  try {
    await test.step('sign up two independent members', async () => {
      await Promise.all([
        signUp(hostPage, `host-${runId}@example.com`, hostNickname, password),
        signUp(guestPage, `guest-${runId}@example.com`, guestNickname, password),
      ]);
    });

    await test.step('become friends', async () => {
      const friendSearch = hostPage.getByPlaceholder('이름(닉네임) 검색');
      await friendSearch.fill(guestNickname);
      await friendSearch.press('Enter');
      const sendFriendRequestButton = hostPage.getByRole('button', { name: '친구 요청', exact: true });
      await expect(sendFriendRequestButton).toBeVisible();
      await sendFriendRequestButton.click();

      await guestPage.getByTitle('친구 관리').click();
      const friendMenu = guestPage.getByRole('heading', { name: '친구 관리' }).locator('..').locator('..');
      await expect(friendMenu.getByText(hostNickname, { exact: true })).toBeVisible();
      await friendMenu.getByRole('button', { name: '승인', exact: true }).click();
      await expect(friendMenu.getByText(hostNickname, { exact: true })).toHaveCount(0);
    });

    await test.step('create a room and accept the realtime invitation', async () => {
      await hostPage.getByRole('link', { name: '경기 생성', exact: true }).click();
      await expect(hostPage).toHaveURL(/\/create-game$/);
      await hostPage.getByLabel('게임방 이름').fill(`실시간 경기 ${runId}`);
      await hostPage.getByRole('button', { name: '게임방 만들기' }).click();

      await expect(hostPage.getByRole('heading', { name: '실시간 당구 게임 대기방' })).toBeVisible();
      await expect(hostPage.getByText(guestNickname, { exact: true })).toBeVisible();
      await hostPage.getByRole('button', { name: `${guestNickname}에게 경기 초대` }).click();

      const invitationDialog = guestPage.getByRole('dialog', { name: /대국 경기 초대 도착/ });
      await expect(invitationDialog).toBeVisible();
      await expect(invitationDialog.getByText(hostNickname, { exact: true })).toBeVisible();
      await invitationDialog.getByRole('button', { name: '수락 및 참가' }).click();

      await expect(guestPage).toHaveURL(/\/create-game$/);
      await expect(guestPage.getByRole('heading', { name: '실시간 당구 게임 대기방' })).toBeVisible();
    });

    await test.step('ready both players and start the room', async () => {
      await guestPage.getByRole('button', { name: '준비 완료' }).click();

      const startButton = hostPage.getByRole('button', { name: '경기 시작하기', exact: true });
      await expect(startButton).toBeEnabled();
      await startButton.click();

      const orderDialog = hostPage.getByRole('dialog', { name: '수구 칠 순서 정하기 (경기방)' });
      await expect(orderDialog).toBeVisible();
      const confirmOrderButton = orderDialog.getByRole('button', { name: '순서 결정 및 경기 시작하기' });
      await expect(confirmOrderButton).toBeEnabled();
      await confirmOrderButton.click();

      await expect(hostPage.getByText('실시간 점수판이 연결되었습니다.')).toBeVisible();
      await expect(guestPage.getByText('방장의 점수판을 실시간으로 보고 있습니다.')).toBeVisible();
    });

    await test.step('synchronize a score and turn change', async () => {
      await hostPage.getByRole('button', { name: '1점 득점' }).click();
      await expect(guestPage.getByLabel(`${hostNickname} 현재 점수`)).toHaveText('1');
      await hostPage.getByRole('button', { name: '이닝 완료 / 교대' }).click();
    });

    await test.step('finish the room and create both records', async () => {
      await hostPage.getByRole('button', { name: '경기 종료' }).click();
      const finishDialog = hostPage.getByRole('dialog', { name: '경기 진행 종료!' });
      await expect(finishDialog).toBeVisible();
      const saveResultButton = finishDialog.getByRole('button', { name: '최종 결과 전송 및 기록 저장' });
      await expect(saveResultButton).toBeEnabled();
      await saveResultButton.click();

      await expect(hostPage).toHaveURL(/\/records$/);
      await expect(guestPage).toHaveURL(/\/records$/);
      await expect(hostPage.getByRole('button', { name: `경기 기록 보기: ${guestNickname}` })).toBeVisible();
      await expect(guestPage.getByRole('button', { name: `경기 기록 보기: ${hostNickname}` })).toBeVisible();
      expect(hostErrors).toEqual([]);
      expect(guestErrors).toEqual([]);
    });
  } finally {
    await Promise.allSettled([hostContext.close(), guestContext.close()]);
  }
});
