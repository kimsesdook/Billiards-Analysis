import {
  clearAuthSession,
  getStoredAccessToken,
  saveAuthSession,
  type AuthSession,
  type AuthSessionPayload,
} from './authStorage';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

type ApiErrorBody = {
  success?: boolean;
  code?: string;
  message?: string;
  errors?: Array<{
    field: string;
    reason: string;
  }>;
};

const DEFAULT_API_BASE_URL = 'http://localhost:8080';
const AUTH_UNAUTHORIZED_EVENT = 'billiards_auth_unauthorized';

type ApiRequestInit = RequestInit & {
  skipAuth?: boolean;
};

type ParsedResponse<T> = {
  response: Response;
  body: ApiResponse<T> | ApiErrorBody | null;
};

let refreshSessionPromise: Promise<AuthSession> | null = null;

export const getApiBaseUrl = () => {
  const meta = import.meta as ImportMeta & {
    env?: Record<string, string | undefined>;
  };

  return (meta.env?.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
};

export class ApiClientError extends Error {
  status: number;
  code?: string;
  errors?: ApiErrorBody['errors'];

  constructor(message: string, status: number, code?: string, errors?: ApiErrorBody['errors']) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const addUnauthorizedListener = (listener: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
  return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, listener);
};

const notifyUnauthorized = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
};

export const getApiErrorMessage = (error: unknown) => {
  if (error instanceof ApiClientError) {
    const firstValidationError = error.errors?.[0];
    return firstValidationError
      ? `${firstValidationError.field}: ${firstValidationError.reason}`
      : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
};

const parseResponse = async <T>(response: Response): Promise<ParsedResponse<T>> => {
  const text = await response.text();
  let body: ApiResponse<T> | ApiErrorBody | null = null;

  if (text) {
    try {
      body = JSON.parse(text) as ApiResponse<T> | ApiErrorBody;
    } catch {
      body = null;
    }
  }

  return { response, body };
};

const executeRequest = async <T>(
  path: string,
  requestInit: RequestInit,
  accessToken: string | null,
): Promise<ParsedResponse<T>> => {
  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestInit,
    credentials: 'include',
    headers,
  });

  return parseResponse<T>(response);
};

const createResponseError = <T>({ response, body }: ParsedResponse<T>) => {
  const errorBody = body as ApiErrorBody | null;
  return new ApiClientError(
    errorBody?.message || `API 요청에 실패했습니다. (${response.status})`,
    response.status,
    errorBody?.code,
    errorBody?.errors,
  );
};

const readResponseData = <T>({ response, body }: ParsedResponse<T>): T => {
  if (!response.ok) {
    throw createResponseError({ response, body });
  }

  const apiBody = body as ApiResponse<T> | null;
  if (apiBody && apiBody.success === false) {
    throw new ApiClientError(apiBody.message || 'API 요청에 실패했습니다.', response.status);
  }

  return (apiBody?.data ?? undefined) as T;
};

const isAuthSessionPayload = (value: unknown): value is AuthSessionPayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthSessionPayload>;
  const member = candidate.member;
  if (!member) return false;

  return (
    typeof candidate.accessToken === 'string'
    && candidate.accessToken.length > 0
    && candidate.tokenType === 'Bearer'
    && typeof candidate.expiresInSeconds === 'number'
    && candidate.expiresInSeconds > 0
    && typeof member.id === 'number'
    && typeof member.email === 'string'
    && typeof member.nickname === 'string'
    && (member.role === 'USER' || member.role === 'ADMIN')
  );
};

const requestSessionRefresh = async (): Promise<AuthSession> => {
  const parsedResponse = await executeRequest<AuthSessionPayload>(
    '/api/auth/refresh',
    { method: 'POST' },
    null,
  );

  if (!parsedResponse.response.ok) {
    if (parsedResponse.response.status === 401) {
      clearAuthSession();
    }
    throw createResponseError(parsedResponse);
  }

  const payload = readResponseData(parsedResponse);
  if (!isAuthSessionPayload(payload)) {
    throw new ApiClientError('인증 응답 형식이 올바르지 않습니다.', 502);
  }

  return saveAuthSession(payload);
};

export const refreshAuthSession = (): Promise<AuthSession> => {
  if (!refreshSessionPromise) {
    refreshSessionPromise = requestSessionRefresh()
      .finally(() => {
        refreshSessionPromise = null;
      });
  }

  return refreshSessionPromise;
};

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { skipAuth = false, ...requestInit } = init;
  let parsedResponse = await executeRequest<T>(
    path,
    requestInit,
    skipAuth ? null : getStoredAccessToken(),
  );

  if (parsedResponse.response.status === 401 && !skipAuth) {
    try {
      await refreshAuthSession();
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        notifyUnauthorized();
      }
      throw error;
    }

    parsedResponse = await executeRequest<T>(path, requestInit, getStoredAccessToken());
  }

  if (!parsedResponse.response.ok && parsedResponse.response.status === 401 && !skipAuth) {
    clearAuthSession();
    notifyUnauthorized();
  }

  return readResponseData(parsedResponse);
}
