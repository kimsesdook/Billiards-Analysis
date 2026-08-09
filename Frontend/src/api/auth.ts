import { ApiClientError, apiRequest, refreshAuthSession } from './client';
import type { AuthMember, AuthSessionPayload } from './authStorage';

export type LoginPayload = {
  email: string;
  password: string;
};

export type SignUpPayload = {
  email: string;
  password: string;
  nickname: string;
};

export type SignUpResult = AuthMember;

export const login = (payload: LoginPayload) =>
  apiRequest<AuthSessionPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const signUp = (payload: SignUpPayload) =>
  apiRequest<SignUpResult>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
    skipAuth: true,
  });

export const restoreSession = async () => {
  try {
    return await refreshAuthSession();
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
};

export const logout = () =>
  apiRequest<void>('/api/auth/logout', {
    method: 'POST',
    skipAuth: true,
  });
