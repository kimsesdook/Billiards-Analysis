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

const getApiBaseUrl = () => {
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

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const text = await response.text();
  let body: ApiResponse<T> | ApiErrorBody | null = null;

  if (text) {
    try {
      body = JSON.parse(text) as ApiResponse<T> | ApiErrorBody;
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;
    throw new ApiClientError(
      errorBody?.message || `API 요청에 실패했습니다. (${response.status})`,
      response.status,
      errorBody?.code,
      errorBody?.errors,
    );
  }

  const apiBody = body as ApiResponse<T> | null;

  if (apiBody && apiBody.success === false) {
    throw new ApiClientError(apiBody.message || 'API 요청에 실패했습니다.', response.status);
  }

  return (apiBody?.data ?? undefined) as T;
}
