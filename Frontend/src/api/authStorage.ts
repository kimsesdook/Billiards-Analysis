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
  savedAt: number;
  expiresAt: number;
};

export type AuthSessionPayload = Omit<AuthSession, 'savedAt' | 'expiresAt'>;

const AUTH_STORAGE_KEY = 'billiards_auth_session';
const AUTH_SESSION_HINT_KEY = 'billiards_has_refresh_session';
const EXPIRY_SAFETY_MARGIN_MS = 5000;
let currentAuthSession: AuthSession | null = null;
const authSessionListeners = new Set<(session: AuthSession | null) => void>();

export const isAuthSessionExpired = (session: AuthSession, now = Date.now()) =>
  now + EXPIRY_SAFETY_MARGIN_MS >= session.expiresAt;

export const getAuthSessionRemainingMs = (session: AuthSession, now = Date.now()) =>
  Math.max(0, session.expiresAt - now - EXPIRY_SAFETY_MARGIN_MS);

export const getStoredAuthSession = (): AuthSession | null => {
  removeLegacyPersistedSession();
  if (currentAuthSession && isAuthSessionExpired(currentAuthSession)) {
    clearAuthSession();
    return null;
  }

  return currentAuthSession;
};

export const getStoredAccessToken = () => getStoredAuthSession()?.accessToken ?? null;

export const saveAuthSession = (session: AuthSessionPayload): AuthSession => {
  const savedAt = Date.now();
  const authSession: AuthSession = {
    ...session,
    savedAt,
    expiresAt: savedAt + session.expiresInSeconds * 1000,
  };

  removeLegacyPersistedSession();
  currentAuthSession = authSession;
  getBrowserStorage()?.setItem(AUTH_SESSION_HINT_KEY, 'true');
  getBrowserStorage()?.setItem('billiards_name', authSession.member.nickname);
  getBrowserStorage()?.setItem('billiards_nickname', authSession.member.nickname);
  notifyAuthSessionListeners();

  return authSession;
};

export const updateStoredAuthMember = (member: Partial<AuthMember>): AuthSession | null => {
  const currentSession = getStoredAuthSession();
  if (!currentSession) return null;

  const nextSession: AuthSession = {
    ...currentSession,
    member: {
      ...currentSession.member,
      ...member,
    },
  };

  currentAuthSession = nextSession;
  getBrowserStorage()?.setItem('billiards_nickname', nextSession.member.nickname);
  notifyAuthSessionListeners();

  return nextSession;
};

export const clearAuthSession = () => {
  currentAuthSession = null;
  const storage = getBrowserStorage();
  storage?.removeItem(AUTH_STORAGE_KEY);
  storage?.removeItem(AUTH_SESSION_HINT_KEY);
  storage?.removeItem('billiards_name');
  storage?.removeItem('billiards_nickname');
  notifyAuthSessionListeners();
};

export const subscribeAuthSession = (listener: (session: AuthSession | null) => void) => {
  authSessionListeners.add(listener);
  return () => {
    authSessionListeners.delete(listener);
  };
};

export const hasRefreshSessionHint = () => (
  getBrowserStorage()?.getItem(AUTH_SESSION_HINT_KEY) === 'true'
);

const getBrowserStorage = () => (
  typeof localStorage === 'undefined' ? null : localStorage
);

const removeLegacyPersistedSession = () => {
  const storage = getBrowserStorage();
  if (storage?.getItem(AUTH_STORAGE_KEY)) {
    storage.setItem(AUTH_SESSION_HINT_KEY, 'true');
  }
  storage?.removeItem(AUTH_STORAGE_KEY);
};

const notifyAuthSessionListeners = () => {
  authSessionListeners.forEach((listener) => listener(currentAuthSession));
};
