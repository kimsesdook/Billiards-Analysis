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
const EXPIRY_SAFETY_MARGIN_MS = 5000;

const isValidMember = (member: unknown): member is AuthMember => {
  if (!member || typeof member !== 'object') return false;
  const candidate = member as Partial<AuthMember>;

  return (
    typeof candidate.id === 'number'
    && typeof candidate.email === 'string'
    && typeof candidate.nickname === 'string'
    && (candidate.role === 'USER' || candidate.role === 'ADMIN')
  );
};

export const isAuthSessionExpired = (session: AuthSession, now = Date.now()) =>
  now + EXPIRY_SAFETY_MARGIN_MS >= session.expiresAt;

export const getAuthSessionRemainingMs = (session: AuthSession, now = Date.now()) =>
  Math.max(0, session.expiresAt - now);

export const getStoredAuthSession = (): AuthSession | null => {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as Partial<AuthSession>;
    if (
      !parsed.accessToken
      || parsed.tokenType !== 'Bearer'
      || typeof parsed.expiresInSeconds !== 'number'
      || typeof parsed.savedAt !== 'number'
      || typeof parsed.expiresAt !== 'number'
      || !isValidMember(parsed.member)
    ) {
      clearAuthSession();
      return null;
    }

    const session = parsed as AuthSession;
    if (isAuthSessionExpired(session)) {
      clearAuthSession();
      return null;
    }

    return session;
  } catch {
    clearAuthSession();
    return null;
  }
};

export const getStoredAccessToken = () => getStoredAuthSession()?.accessToken ?? null;

export const saveAuthSession = (session: AuthSessionPayload): AuthSession => {
  const savedAt = Date.now();
  const authSession: AuthSession = {
    ...session,
    savedAt,
    expiresAt: savedAt + session.expiresInSeconds * 1000,
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authSession));
  localStorage.setItem('billiards_name', authSession.member.nickname);
  localStorage.setItem('billiards_nickname', authSession.member.nickname);

  return authSession;
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem('billiards_name');
  localStorage.removeItem('billiards_nickname');
};
