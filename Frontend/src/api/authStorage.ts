export type AuthMember = {
  id: number;
  email: string;
  nickname: string;
  role: 'USER' | 'ADMIN';
};

export type AuthSession = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  member: AuthMember;
};

const AUTH_STORAGE_KEY = 'billiards_auth_session';

export const getStoredAuthSession = (): AuthSession | null => {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as AuthSession;
    if (!parsed.accessToken || parsed.tokenType !== 'Bearer' || !parsed.member) {
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const getStoredAccessToken = () => getStoredAuthSession()?.accessToken ?? null;

export const saveAuthSession = (session: AuthSession) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  localStorage.setItem('billiards_name', session.member.nickname);
  localStorage.setItem('billiards_nickname', session.member.nickname);
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
