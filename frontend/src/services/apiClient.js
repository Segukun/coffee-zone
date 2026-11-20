import { ApiError } from './ApiError.js';
import { apiBaseUrl, buildApiUrl, normalizeApiBaseUrl } from './apiConfig.js';

const httpMessages = {
  400: 'Invalid request data.',
  401: 'Authentication required.',
  403: 'Access is not allowed.',
  404: 'Resource not found.',
  409: 'The request conflicts with existing data.',
  413: 'The request is too large.',
  415: 'The request format is not supported.',
  429: 'Too many requests. Please try again later.',
};

function safeText(value, fallback, sensitive) {
  if (typeof value !== 'string' || !value.trim() || value.length > 500
    || /[\r\n]|mongodb(?:\+srv)?:|JWT_SECRET|MONGODB_URI|Bearer\s|eyJ[\w-]+\.[\w-]+\.[\w-]+|\bat\s+\S+\s*\(|-----BEGIN .*PRIVATE KEY/i.test(value)
    || sensitive.some(secret => value.includes(secret))) return fallback;
  return value;
}

function retryAfterSeconds(response) {
  const value = response.headers.get('Retry-After');
  if (!value?.trim()) return null;
  if (/^\d+$/.test(value.trim())) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : null;
  }
  // HTTP-date values contain a weekday; avoid treating negative numbers as dates.
  const timestamp = /^[a-z]{3},/i.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(timestamp) ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000)) : null;
}

function httpError(response, payload, sensitive) {
  const fallback = response.status >= 500 ? 'An unexpected server error occurred.'
    : httpMessages[response.status] || 'The API request failed.';
  const error = payload?.error;
  const code = typeof error?.code === 'string' && /^[A-Z][A-Z\d_]{0,79}$/.test(error.code)
    ? safeText(error.code, 'HTTP_ERROR', sensitive) : 'HTTP_ERROR';
  const details = response.status < 500 && Array.isArray(error?.details)
    ? error.details.filter(detail => typeof detail?.field === 'string'
      && /^[a-zA-Z_][\w.]{0,99}$/.test(detail.field)
      && !sensitive.some(secret => detail.field.includes(secret)))
      .map(detail => ({ field: detail.field, message: safeText(detail.message, 'Invalid value.', sensitive) }))
    : undefined;
  return new ApiError(response.status >= 500 ? fallback : safeText(error?.message, fallback, sensitive), {
    status: response.status, code, details, retryAfter: retryAfterSeconds(response),
  });
}

function cancelled(error, signal) {
  if (signal?.aborted || error?.name === 'AbortError') {
    throw new DOMException('Request was cancelled.', 'AbortError');
  }
}

export function createApiClient({ baseUrl = apiBaseUrl, getToken = () => null, fetchImpl = (...args) => fetch(...args) } = {}) {
  const normalizedBase = normalizeApiBaseUrl(baseUrl);
  let tokenProvider = getToken;
  function setTokenProvider(provider) {
    if (typeof provider !== 'function') throw new ApiError('Provide a token provider function.', { code: 'INVALID_REQUEST' });
    tokenProvider = provider;
  }
  setTokenProvider(getToken);

  async function request(method, path, data, { query, headers: extraHeaders, auth = false, signal } = {}) {
    cancelled(undefined, signal);
    const url = buildApiUrl(normalizedBase, path, query);
    const sensitive = [];
    let headers;
    let body;
    try {
      headers = new Headers(extraHeaders);
      if (headers.has('Authorization')) throw new Error();
      headers.set('Accept', 'application/json');
      headers.delete('Content-Type');
      if (typeof FormData !== 'undefined' && data instanceof FormData) {
        body = data;
      } else if (data !== undefined) {
        body = JSON.stringify(data, (key, value) => {
          if (/password|token|secret|authorization/i.test(key) && typeof value === 'string' && value) sensitive.push(value);
          return value;
        });
        if (body === undefined) throw new Error();
        headers.set('Content-Type', 'application/json');
      }
    } catch {
      throw new ApiError('Invalid request headers or JSON body. Use auth for Authorization.', { code: 'INVALID_REQUEST' });
    }
    if (auth) {
      let token;
      try { token = await tokenProvider(); } catch (error) {
        cancelled(error, signal);
        throw new ApiError('Unable to obtain an authentication token.', { code: 'AUTH_TOKEN_UNAVAILABLE' });
      }
      cancelled(undefined, signal);
      if (typeof token !== 'string' || !token.trim()) {
        throw new ApiError('An authentication token is required.', { code: 'AUTH_TOKEN_MISSING' });
      }
      if (/\s/.test(token.trim())) throw new ApiError('The authentication token is invalid.', { code: 'AUTH_TOKEN_UNAVAILABLE' });
      sensitive.push(token, token.trim());
      try { headers.set('Authorization', 'Bearer ' + token.trim()); } catch {
        throw new ApiError('The authentication token is invalid.', { code: 'AUTH_TOKEN_UNAVAILABLE' });
      }
    }
    let response;
    try {
      response = await fetchImpl(url, { method, headers, body, signal, credentials: 'omit', redirect: 'error' });
    } catch (error) {
      cancelled(error, signal);
      throw new ApiError('Unable to reach the API. Check your connection and try again.', { code: 'NETWORK_ERROR' });
    }
    cancelled(undefined, signal);
    if (response.status === 204 || response.status === 205) return null;
    let text;
    try { text = await response.text(); } catch (error) {
      cancelled(error, signal);
      throw new ApiError('Unable to read the API response.', { status: response.status, code: 'RESPONSE_READ_ERROR' });
    }
    cancelled(undefined, signal);
    if (!text.trim()) {
      if (!response.ok) throw httpError(response, undefined, sensitive);
      return null;
    }
    let payload;
    const contentType = response.headers.get('Content-Type') || '';
    if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|\s*$)/i.test(contentType)) {
      if (!response.ok) throw httpError(response, undefined, sensitive);
      throw new ApiError('The API returned an unexpected response format.', { status: response.status, code: 'INVALID_RESPONSE' });
    }
    try { payload = JSON.parse(text); } catch {
      throw new ApiError('The API returned invalid JSON.', {
        status: response.status, code: 'INVALID_JSON_RESPONSE', retryAfter: retryAfterSeconds(response),
      });
    }
    if (!response.ok) throw httpError(response, payload, sensitive);
    return payload;
  }

  return {
    setTokenProvider,
    get: (path, options) => request('GET', path, undefined, options),
    post: (path, data, options) => request('POST', path, data, options),
    put: (path, data, options) => request('PUT', path, data, options),
    patch: (path, data, options) => request('PATCH', path, data, options),
    delete: (path, options) => request('DELETE', path, undefined, options),
  };
}

export default createApiClient();
