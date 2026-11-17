export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://127.0.0.1:8000';

const DEFAULT_TIMEOUT_MS =
  Number(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_TIMEOUT) ||
  15000;

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  isNetworkError: boolean;
  isTimeout: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      detail?: unknown;
      isNetworkError?: boolean;
      isTimeout?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.detail = options.detail;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isTimeout = options.isTimeout ?? false;
  }
}

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('datasentinel_demo_mode') === 'true';
}

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}

function parseFastApiErrorPayload(result: unknown, status: number): string {
  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    if (typeof obj.detail === 'string') {
      return obj.detail;
    }
    if (Array.isArray(obj.detail)) {
      return obj.detail
        .map((item: { loc?: Array<string | number>; msg?: string }) => {
          const field = item.loc ? item.loc.join('.') : 'field';
          return `${field}: ${item.msg || 'invalid value'}`;
        })
        .join('; ');
    }
    if (typeof obj.message === 'string') {
      return obj.message;
    }
  }
  if (typeof result === 'string' && result.trim()) {
    return result;
  }
  return `HTTP ${status}`;
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, skipAuth = false, signal: externalSignal, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const body = fetchOptions.body;
  if (body) {
    if (body instanceof FormData) {
      // Let browser set multipart/form-data boundary automatically
      headers.delete('Content-Type');
    } else if (body instanceof URLSearchParams) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
      }
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  if (!skipAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('datasentinel_token');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timeoutId);
      throw new ApiError('Request was cancelled.', { status: 0 });
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (response.status === 204) {
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}`, { status: response.status });
      }
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    let result: unknown = rawText;
    if (rawText.trim() && contentType.includes('application/json')) {
      try {
        result = JSON.parse(rawText);
      } catch {
        result = rawText;
      }
    } else if (!rawText.trim()) {
      result = null;
    }

    if (!response.ok) {
      if (response.status === 401) {
        const detailMsg = parseFastApiErrorPayload(result, 401);
        throw new ApiError(
          detailMsg !== 'HTTP 401'
            ? detailMsg
            : 'Authentication required. Please log in again.',
          { status: 401, detail: result }
        );
      }

      if (response.status === 403) {
        const detailMsg = parseFastApiErrorPayload(result, 403);
        throw new ApiError(
          detailMsg !== 'HTTP 403'
            ? detailMsg
            : 'You do not have permission for this operation.',
          { status: 403, detail: result }
        );
      }

      if (response.status === 503) {
        const detailMsg = parseFastApiErrorPayload(result, 503);
        throw new ApiError(
          detailMsg !== 'HTTP 503'
            ? detailMsg
            : 'Service Unavailable (503): Database or backend dependency is unreachable.',
          { status: 503, detail: result }
        );
      }

      const message = parseFastApiErrorPayload(result, response.status);
      throw new ApiError(message, { status: response.status, detail: result });
    }

    return result as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      if (timedOut) {
        throw new ApiError(
          `Request timed out after ${Math.round(timeoutMs / 1000)}s waiting for ${API_BASE_URL}.`,
          { status: 0, isTimeout: true }
        );
      }
      throw new ApiError('Request was cancelled.', { status: 0 });
    }
    throw new ApiError(
      `Network Error: Unable to reach DataSentinel backend at ${API_BASE_URL}. Ensure FastAPI is running on port 8000.`,
      { status: 0, isNetworkError: true }
    );
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Explicit Demo/Live dispatcher.
 * Live FastAPI backend is ALWAYS used unless the user explicitly enabled Demo Mode.
 * Never falls back silently on live backend failures.
 */
export async function executeApi<T>(
  liveFn: () => Promise<T>,
  demoFn: () => T | Promise<T>
): Promise<{ data: T; isLive: boolean }> {
  if (isDemoMode()) {
    const data = await demoFn();
    return { data, isLive: false };
  }
  const data = await liveFn();
  return { data, isLive: true };
}
