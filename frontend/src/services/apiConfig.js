import { ApiError } from './ApiError.js';

export function normalizeApiBaseUrl(value = 'http://localhost:3000/api') {
  try {
    if (typeof value !== 'string' || !value.trim()) throw new Error();
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error();
    }
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    return url.href.replace(/\/+$/, '');
  } catch {
    throw new ApiError('API URL configuration is invalid.', { code: 'INVALID_API_URL' });
  }
}

export const apiBaseUrl = normalizeApiBaseUrl(import.meta.env?.VITE_API_URL);

export function buildApiUrl(baseUrl, path, query) {
  try {
    if (typeof path !== 'string' || !path || /^[a-z][a-z\d+.-]*:/i.test(path)
      || path.startsWith('//') || /[\\?#\s]/.test(path)) throw new Error();
    const relative = path.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
    if (relative.split('/').some(part => ['.', '..'].includes(decodeURIComponent(part)))) throw new Error();
    const prefix = new URL(baseUrl).pathname.replace(/^\/|\/$/g, '');
    if (prefix && (relative === prefix || relative.startsWith(prefix + '/'))) throw new Error();
    const url = new URL(baseUrl + (relative ? '/' + relative : ''));
    if (query instanceof URLSearchParams) {
      url.search = query.toString();
    } else if (query !== undefined) {
      if (!query || Object.getPrototypeOf(query) !== Object.prototype) throw new Error();
      for (const [key, value] of Object.entries(query)) {
        for (const item of Array.isArray(value) ? value : [value]) {
          if (item === undefined || item === null) continue;
          if (!['string', 'number', 'boolean'].includes(typeof item)
            || (typeof item === 'number' && !Number.isFinite(item))) throw new Error();
          url.searchParams.append(key, String(item));
        }
      }
    }
    return url.href;
  } catch {
    throw new ApiError('Use a relative API path and valid query parameters.', { code: 'INVALID_REQUEST' });
  }
}
