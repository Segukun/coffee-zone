import test from 'node:test';
import assert from 'node:assert/strict';
import api, { createApiClient } from '../src/services/apiClient.js';
import { ApiError } from '../src/services/ApiError.js';

const baseUrl = 'https://api.example.test/api';
function json(payload = { data: { user: { id: 'test-user' } }, meta: { total: 1 } }, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
function setup(context, response = () => json(), options = {}) {
  const fetchImpl = context.mock.fn(async (...args) => response(...args));
  return { client: createApiClient({ baseUrl, fetchImpl, ...options }), fetchImpl };
}
function sent(fetchImpl) {
  const [url, options] = fetchImpl.mock.calls[0].arguments;
  return { url, ...options };
}

test('GET builds a relative URL, preserves the complete JSON envelope and sends no body or Content-Type', async context => {
  const { client, fetchImpl } = setup(context);
  assert.deepEqual(await client.get('/users/me'), { data: { user: { id: 'test-user' } }, meta: { total: 1 } });
  const request = sent(fetchImpl);
  assert.equal(request.url, baseUrl + '/users/me');
  assert.equal(request.method, 'GET');
  assert.equal(request.body, undefined);
  assert.equal(request.headers.get('Accept'), 'application/json');
  assert.equal(request.headers.has('Content-Type'), false);
  assert.equal(request.credentials, 'omit');
  assert.equal(request.redirect, 'error');
});

test('query parameters encode spaces and reserved values, repeat arrays, keep false/zero and omit nullish values', async context => {
  const { client, fetchImpl } = setup(context);
  await client.get('/users/me', { query: { search: 'a & b', page: 0, active: false, tag: ['js', 'c++'], empty: '', skip: null, absent: undefined } });
  const query = new URL(sent(fetchImpl).url).searchParams;
  assert.equal(query.get('search'), 'a & b');
  assert.equal(query.get('page'), '0');
  assert.equal(query.get('active'), 'false');
  assert.deepEqual(query.getAll('tag'), ['js', 'c++']);
  assert.equal(query.get('empty'), '');
  assert.equal(query.has('skip'), false);
  assert.equal(query.has('absent'), false);
});

test('URLSearchParams are supported without mutating the caller', async context => {
  const { client, fetchImpl } = setup(context);
  const query = new URLSearchParams('tag=a&tag=b');
  await client.get('users/me', { query });
  assert.equal(new URL(sent(fetchImpl).url).search, '?tag=a&tag=b');
  assert.equal(query.toString(), 'tag=a&tag=b');
});

for (const method of ['post', 'put', 'patch']) {
  test(`${method.toUpperCase()} serializes JSON and sets Content-Type`, async context => {
    const { client, fetchImpl } = setup(context);
    await client[method]('/users/me', { name: 'Alex', enabled: false });
    const request = sent(fetchImpl);
    assert.equal(request.method, method.toUpperCase());
    assert.equal(request.body, '{"name":"Alex","enabled":false}');
    assert.equal(request.headers.get('Content-Type'), 'application/json');
  });
}

test('DELETE supports options and query without a body', async context => {
  const { client, fetchImpl } = setup(context, () => new Response(null, { status: 204 }));
  assert.equal(await client.delete('/resource', { query: { version: 1 } }), null);
  assert.equal(sent(fetchImpl).method, 'DELETE');
  assert.equal(sent(fetchImpl).body, undefined);
  assert.equal(sent(fetchImpl).headers.has('Content-Type'), false);
});

test('custom headers are copied without mutating the input and JSON headers remain consistent', async context => {
  const { client, fetchImpl } = setup(context);
  const headers = new Headers({ 'X-Request-ID': 'request-1', 'Content-Type': 'text/plain' });
  await client.get('/health', { headers });
  assert.equal(sent(fetchImpl).headers.get('X-Request-ID'), 'request-1');
  assert.equal(sent(fetchImpl).headers.has('Content-Type'), false);
  assert.equal(headers.get('Content-Type'), 'text/plain');
});

test('FormData retains its body and lets fetch supply its multipart boundary', async context => {
  const { client, fetchImpl } = setup(context);
  const form = new FormData();
  form.append('name', 'Fictitious upload');
  await client.post('/resource', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  assert.equal(sent(fetchImpl).body, form);
  assert.equal(sent(fetchImpl).headers.has('Content-Type'), false);
});

test('undefined body sends no Content-Type while null is valid JSON', async context => {
  const { client, fetchImpl } = setup(context);
  await client.post('/resource');
  assert.equal(sent(fetchImpl).headers.has('Content-Type'), false);
  await client.post('/resource', null);
  const options = fetchImpl.mock.calls[1].arguments[1];
  assert.equal(options.body, 'null');
  assert.equal(options.headers.get('Content-Type'), 'application/json');
});

test('invalid JSON input fails safely before fetch', async context => {
  const { client, fetchImpl } = setup(context);
  const circular = { password: 'private-input' };
  circular.self = circular;
  for (const data of [circular, { value: 1n }, () => 'not JSON']) {
    await assert.rejects(client.post('/resource', data), error => error.code === 'INVALID_REQUEST' && !error.message.includes('private-input'));
  }
  assert.equal(fetchImpl.mock.callCount(), 0);
});

test('private requests get a fresh Bearer token from an async provider', async context => {
  let token = 'local-test-token-1';
  const { client, fetchImpl } = setup(context, () => json(), { getToken: async () => token });
  await client.get('/users/me', { auth: true });
  assert.equal(sent(fetchImpl).headers.get('Authorization'), 'Bearer local-test-token-1');
  token = 'local-test-token-2';
  await client.get('/users/me', { auth: true });
  assert.equal(fetchImpl.mock.calls[1].arguments[1].headers.get('Authorization'), 'Bearer local-test-token-2');
});

test('public requests neither invoke the token provider nor attach Authorization', async context => {
  const getToken = context.mock.fn(() => 'local-test-token');
  const { client, fetchImpl } = setup(context, () => json(), { getToken });
  await client.get('/users/alex');
  assert.equal(getToken.mock.callCount(), 0);
  assert.equal(sent(fetchImpl).headers.has('Authorization'), false);
});

test('missing private token is a local error with no invented HTTP status or network call', async context => {
  const { client, fetchImpl } = setup(context);
  await assert.rejects(client.get('/users/me', { auth: true }), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, null);
    assert.equal(error.code, 'AUTH_TOKEN_MISSING');
    return true;
  });
  assert.equal(fetchImpl.mock.callCount(), 0);
});

test('provider failures and invalid tokens cannot leak their values', async context => {
  const { client, fetchImpl } = setup(context, () => json(), { getToken: () => { throw new Error('private-token-value'); } });
  await assert.rejects(client.get('/users/me', { auth: true }), error => error.code === 'AUTH_TOKEN_UNAVAILABLE' && !error.stack.includes('private-token-value'));
  client.setTokenProvider(() => 'private token value');
  await assert.rejects(client.get('/users/me', { auth: true }), { code: 'AUTH_TOKEN_UNAVAILABLE', status: null });
  assert.equal(fetchImpl.mock.callCount(), 0);
});

for (const [label, token] of [['control character', 'private-token\u0000'], ['non-HTTP character', 'private-token\u2603']]) {
  test(`an authentication token with ${label} produces a safe local error`, async context => {
    const { client, fetchImpl } = setup(context, () => json(), { getToken: () => token });
    await assert.rejects(client.get('/users/me', { auth: true }), error => error.code === 'AUTH_TOKEN_UNAVAILABLE'
      && error.status === null && !error.stack.includes('private-token'));
    assert.equal(fetchImpl.mock.callCount(), 0);
  });
}

test('token providers can be connected and disconnected without storage or session logic', async context => {
  const { client, fetchImpl } = setup(context);
  client.setTokenProvider(() => 'local-test-token');
  await client.get('/users/me', { auth: true });
  assert.equal(sent(fetchImpl).headers.get('Authorization'), 'Bearer local-test-token');
  client.setTokenProvider(() => null);
  await assert.rejects(client.get('/users/me', { auth: true }), { code: 'AUTH_TOKEN_MISSING' });
  assert.throws(() => client.setTokenProvider('not a function'), { code: 'INVALID_REQUEST' });
});

test('manual Authorization headers are rejected to keep public/private behavior centralized', async context => {
  const { client, fetchImpl } = setup(context);
  await assert.rejects(client.get('/health', { headers: { authorization: 'Bearer private-token' } }), { code: 'INVALID_REQUEST' });
  assert.equal(fetchImpl.mock.callCount(), 0);
});

for (const status of [200, 201]) {
  test(`HTTP ${status} returns the complete parsed JSON`, async context => {
    const payload = { data: { token: 'fictitious-login-token', user: { id: '123' } }, meta: { source: 'test' } };
    const { client } = setup(context, () => json(payload, status));
    assert.deepEqual(await client.post('/auth/login', {}), payload);
  });
}

for (const status of [204, 205, 200]) {
  test(`empty HTTP ${status} returns null`, async context => {
    const { client } = setup(context, () => new Response(null, { status }));
    assert.equal(await client.get('/resource'), null);
  });
}

test('JSON arrays and vendor JSON content types are preserved', async context => {
  const { client } = setup(context, () => json([1, 2], 200, { 'Content-Type': 'application/vnd.example+json; charset=utf-8' }));
  assert.deepEqual(await client.get('/resource'), [1, 2]);
});

test('unexpected non-JSON success becomes a controlled format error without raw content', async context => {
  const { client } = setup(context, () => new Response('<html>private-proxy-content</html>', { headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(client.get('/health'), error => error.status === 200 && error.code === 'INVALID_RESPONSE' && !error.stack.includes('private-proxy-content'));
});

for (const status of [200, 400]) {
  test(`malformed JSON at HTTP ${status} has a distinct safe error`, async context => {
    const { client } = setup(context, () => new Response('{"private-token":', { status, headers: { 'Content-Type': 'application/json' } }));
    await assert.rejects(client.get('/resource'), error => error.status === status && error.code === 'INVALID_JSON_RESPONSE' && !error.stack.includes('private-token'));
  });
}

for (const [status, code] of [
  [400, 'VALIDATION_ERROR'], [401, 'INVALID_CREDENTIALS'], [403, 'CORS_ORIGIN_DENIED'],
  [404, 'USER_NOT_FOUND'], [409, 'DUPLICATE_KEY'], [413, 'HTTP_ERROR'], [415, 'UNSUPPORTED_MEDIA_TYPE'],
  [429, 'RATE_LIMIT_EXCEEDED'], [500, 'INTERNAL_SERVER_ERROR'], [418, 'CUSTOM_ERROR'], [503, 'TEMPORARILY_UNAVAILABLE'],
]) {
  test(`HTTP ${status} preserves status and API code, using safe public messages`, async context => {
    const { client, fetchImpl } = setup(context, () => json({ error: { code, message: 'A safe public message.', details: [{ field: 'name', message: 'Name is required.' }] } }, status));
    await assert.rejects(client.post('/resource', {}), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, status);
      assert.equal(error.code, code);
      assert.equal(error.message, status >= 500 ? 'An unexpected server error occurred.' : 'A safe public message.');
      assert.deepEqual(error.details, status >= 500 ? undefined : [{ field: 'name', message: 'Name is required.' }]);
      return true;
    });
    assert.equal(fetchImpl.mock.callCount(), 1, 'Errors must not retry mutations');
  });
}

test('HTTP 401 causes no automatic logout and still permits subsequent requests', async context => {
  let failed = true;
  const { client, fetchImpl } = setup(context, () => failed ? json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401) : json(), { getToken: () => 'local-test-token' });
  await assert.rejects(client.post('/auth/login', {}), { code: 'INVALID_CREDENTIALS' });
  failed = false;
  await client.get('/users/me', { auth: true });
  assert.equal(fetchImpl.mock.calls[1].arguments[1].headers.get('Authorization'), 'Bearer local-test-token');
});

for (const [label, value, expected] of [
  ['seconds', '120', 120], ['zero', '0', 0], ['invalid', 'later', null], ['negative', '-1', null],
  ['HTTP date', 'Thu, 01 Jan 2026 00:00:30 GMT', 30], ['past date', 'Wed, 31 Dec 2025 23:59:00 GMT', 0],
]) {
  test(`Retry-After ${label} is represented as seconds or null`, async context => {
    context.mock.method(Date, 'now', () => Date.parse('2026-01-01T00:00:00Z'));
    const { client } = setup(context, () => json({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' } }, 429, { 'Retry-After': value }));
    await assert.rejects(client.get('/resource'), error => error.retryAfter === expected && error.status === 429);
  });
}

for (const label of ['missing details', 'missing error object', 'empty body', 'HTML proxy error']) {
  test(`HTTP failures with ${label} retain their status without exposing raw content`, async context => {
    const responses = {
      'missing details': () => json({ error: { code: 'DUPLICATE_KEY', message: 'Username is already in use.' } }, 409),
      'missing error object': () => json({ unexpected: 'private-value' }, 409),
      'empty body': () => new Response(null, { status: 409 }),
      'HTML proxy error': () => new Response('<html>private-value</html>', { status: 409, headers: { 'Content-Type': 'text/html' } }),
    };
    const { client } = setup(context, responses[label]);
    await assert.rejects(client.get('/resource'), error => error.status === 409 && error.details === undefined && !error.stack.includes('private-value'));
  });
}

test('tokens and request passwords cannot appear in error fields or logs', async context => {
  const token = 'LOCAL_PRIVATE_TOKEN';
  const password = 'LocalPassword123!';
  const logs = ['log', 'warn', 'error'].map(method => context.mock.method(console, method, () => {}));
  const { client } = setup(context, () => json({ error: {
    code: token, message: 'Rejected ' + token, details: [
      { field: 'password', message: 'Rejected ' + password },
      { field: token, message: 'Must not expose this field' },
      { field: '$unsafe', message: 'Must not expose this field' },
    ],
  } }, 400), { getToken: () => token });
  await assert.rejects(client.post('/resource', { password }, { auth: true }), error => {
    for (const output of [error.stack, JSON.stringify(error)]) {
      assert.ok(!output.includes(token));
      assert.ok(!output.includes(password));
    }
    assert.equal(error.code, 'HTTP_ERROR');
    assert.deepEqual(error.details, [{ field: 'password', message: 'Invalid value.' }]);
    return true;
  });
  for (const log of logs) assert.equal(log.mock.callCount(), 0);
});

for (const label of ['backend disconnected', 'network failure', 'opaque browser CORS failure']) {
  test(`${label} has NETWORK_ERROR with no fictional HTTP status`, async context => {
    const { client, fetchImpl } = setup(context, () => { throw new TypeError('Failed to fetch private-token-value'); });
    await assert.rejects(client.patch('/users/me', { bio: 'test' }), error => error.code === 'NETWORK_ERROR' && error.status === null && !error.stack.includes('private-token-value'));
    assert.equal(fetchImpl.mock.callCount(), 1);
  });
}

test('AbortSignal is forwarded and a cancelled fetch stays recognizable without leaking its reason', async context => {
  const controller = new AbortController();
  const { client, fetchImpl } = setup(context, (_url, options) => {
    assert.equal(options.signal, controller.signal);
    controller.abort('private-token-value');
    throw new DOMException('private-token-value', 'AbortError');
  });
  await assert.rejects(client.get('/health', { signal: controller.signal }), error => error.name === 'AbortError' && !error.message.includes('private-token-value'));
  assert.equal(fetchImpl.mock.callCount(), 1);
});

test('already aborted signals never call fetch', async context => {
  const { client, fetchImpl } = setup(context);
  await assert.rejects(client.get('/health', { signal: AbortSignal.abort('private-value') }), { name: 'AbortError' });
  assert.equal(fetchImpl.mock.callCount(), 0);
});

test('cancellation while reading the response remains an AbortError', async context => {
  const controller = new AbortController();
  const response = json();
  context.mock.method(response, 'text', async () => { controller.abort(); throw new DOMException('Aborted', 'AbortError'); });
  const { client } = setup(context, () => response);
  await assert.rejects(client.get('/health', { signal: controller.signal }), { name: 'AbortError' });
});

test('response stream failures retain the observed status and do not become HTTP 500', async context => {
  const response = json();
  context.mock.method(response, 'text', async () => { throw new Error('private-stream-details'); });
  const { client } = setup(context, () => response);
  await assert.rejects(client.get('/health'), error => error.status === 200 && error.code === 'RESPONSE_READ_ERROR' && !error.stack.includes('private-stream-details'));
});

for (const phase of ['headers', 'body']) {
  test(`cancellation after receiving ${phase} is honored even when the transport resolves`, async context => {
    const controller = new AbortController();
    const response = phase === 'headers' ? new Response(null, { status: 204 }) : json();
    if (phase === 'body') context.mock.method(response, 'text', async () => {
      controller.abort();
      return '{"data":{}}';
    });
    const { client } = setup(context, () => {
      if (phase === 'headers') controller.abort();
      return response;
    });
    await assert.rejects(client.get('/health', { signal: controller.signal }), { name: 'AbortError' });
  });
}

test('cancellation during asynchronous token lookup never dispatches the request', async context => {
  const controller = new AbortController();
  const { client, fetchImpl } = setup(context, () => json(), { getToken: async () => { controller.abort(); return 'local-token'; } });
  await assert.rejects(client.get('/users/me', { auth: true, signal: controller.signal }), { name: 'AbortError' });
  assert.equal(fetchImpl.mock.callCount(), 0);
});

for (const [label, message] of [
  ['private URI', 'mongodb://fictitious:private@database.invalid/users'],
  ['private environment', 'JWT_SECRET=private-value'],
  ['stack trace', 'Error: private-details\n at someFunction (private.js:1:1)'],
  ['Bearer token', 'Bearer fictitious-private-token'],
]) {
  test(`technical error messages with ${label} use a safe fallback`, async context => {
    const { client } = setup(context, () => json({ error: { code: 'VALIDATION_ERROR', message } }, 400));
    await assert.rejects(client.get('/health'), error => error.message === 'Invalid request data.' && error.cause === undefined);
  });
}

test('the exported singleton uses fetch lazily and exposes all five HTTP methods', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => json({ data: { status: 'ok' } }));
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) assert.equal(typeof api[method], 'function');
  assert.deepEqual(await api.get('/health'), { data: { status: 'ok' } });
  assert.equal(fetchMock.mock.callCount(), 1);
});
