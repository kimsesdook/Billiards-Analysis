import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthSession,
  getAuthSessionRemainingMs,
  getStoredAccessToken,
  getStoredAuthSession,
  saveAuthSession,
  subscribeAuthSession,
  updateStoredAuthMember,
  type AuthSessionPayload,
} from './authStorage';

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
};

const sessionPayload: AuthSessionPayload = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 60,
  member: {
    id: 1,
    email: 'player@example.com',
    nickname: 'PlayerOne',
    role: 'USER',
  },
};

describe('in-memory authentication storage', () => {
  let storage: Storage;

  beforeEach(() => {
    vi.useRealTimers();
    storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    clearAuthSession();
  });

  it('keeps the access token in memory and removes the legacy persisted session', () => {
    storage.setItem('billiards_auth_session', JSON.stringify({ accessToken: 'legacy-token' }));

    const session = saveAuthSession(sessionPayload);

    expect(getStoredAuthSession()).toEqual(session);
    expect(getStoredAccessToken()).toBe('access-token');
    expect(storage.getItem('billiards_auth_session')).toBeNull();
    expect(storage.getItem('billiards_has_refresh_session')).toBe('true');
    expect(storage.getItem('billiards_nickname')).toBe('PlayerOne');
  });

  it('notifies subscribers when the session member changes and when the session clears', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuthSession(listener);

    saveAuthSession(sessionPayload);
    updateStoredAuthMember({ nickname: 'UpdatedPlayer' });
    clearAuthSession();

    expect(listener).toHaveBeenNthCalledWith(1, expect.objectContaining({ accessToken: 'access-token' }));
    expect(listener).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ member: expect.objectContaining({ nickname: 'UpdatedPlayer' }) }),
    );
    expect(listener).toHaveBeenNthCalledWith(3, null);
    unsubscribe();
  });

  it('treats the access token as expired five seconds before its server expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T00:00:00Z'));
    const session = saveAuthSession(sessionPayload);

    expect(getAuthSessionRemainingMs(session)).toBe(55_000);

    vi.advanceTimersByTime(55_001);
    expect(getStoredAuthSession()).toBeNull();
    expect(getStoredAccessToken()).toBeNull();
  });
});
