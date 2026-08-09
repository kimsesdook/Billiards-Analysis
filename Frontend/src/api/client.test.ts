import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAuthSession, getStoredAuthSession, saveAuthSession, type AuthSessionPayload } from './authStorage';
import { apiRequest } from './client';

const fetchMock = vi.fn<typeof fetch>();

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

const oldSession: AuthSessionPayload = {
  accessToken: 'old-access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 3600,
  member: {
    id: 1,
    email: 'player@example.com',
    nickname: 'PlayerOne',
    role: 'USER',
  },
};

const refreshedSession: AuthSessionPayload = {
  ...oldSession,
  accessToken: 'new-access-token',
};

const apiSuccess = <T>(data: T) => new Response(JSON.stringify({
  success: true,
  data,
  message: null,
}), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});

const unauthorized = () => new Response(JSON.stringify({
  success: false,
  code: 'AUTH_001',
  message: 'Authentication is required.',
}), {
  status: 401,
  headers: { 'Content-Type': 'application/json' },
});

const authorizationHeader = (init?: RequestInit) => (
  new Headers(init?.headers).get('Authorization')
);

describe('API client refresh flow', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    clearAuthSession();
  });

  it('includes credentials, refreshes after 401, and retries once with the new access token', async () => {
    saveAuthSession(oldSession);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(apiSuccess(refreshedSession))
      .mockResolvedValueOnce(apiSuccess({ value: 'retried' }));

    await expect(apiRequest<{ value: string }>('/api/protected')).resolves.toEqual({ value: 'retried' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
    expect(authorizationHeader(fetchMock.mock.calls[0]?.[1])).toBe('Bearer old-access-token');
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('/api/auth/refresh');
    expect(authorizationHeader(fetchMock.mock.calls[2]?.[1])).toBe('Bearer new-access-token');
  });

  it('shares one refresh request between concurrent 401 responses', async () => {
    saveAuthSession(oldSession);
    let refreshCalls = 0;

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls += 1;
        return apiSuccess(refreshedSession);
      }
      if (authorizationHeader(init) === 'Bearer old-access-token') {
        return unauthorized();
      }
      return apiSuccess({ path: url });
    });

    await Promise.all([
      apiRequest('/api/protected/one'),
      apiRequest('/api/protected/two'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('does not retry again when the refresh cookie is rejected', async () => {
    saveAuthSession(oldSession);
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());

    await expect(apiRequest('/api/protected')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_001',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getStoredAuthSession()).toBeNull();
  });

  it('does not attach an access token to public authentication requests', async () => {
    saveAuthSession(oldSession);
    fetchMock.mockResolvedValueOnce(apiSuccess({ id: 1 }));

    await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: 'player@example.com' }),
      skipAuth: true,
    });

    expect(fetchMock.mock.calls[0]?.[1]?.credentials).toBe('include');
    expect(authorizationHeader(fetchMock.mock.calls[0]?.[1])).toBeNull();
  });
});
