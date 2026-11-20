import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { setTimeout } from 'node:timers/promises';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import { createApp } from '../src/app.js';
import { getSecurityConfig, validateStartupConfig } from '../src/config/security.js';
import { configureAuth, mockUserQuery, serve } from '../test-support/authTestUtils.js';

async function instance(context, config = getSecurityConfig({})) {
  const http = await serve(createApp(config));
  context.after(() => http.close());
  return http.url;
}

function attempt(url, path = '/api/auth/login', options = {}) {
  return fetch(url + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', ...options,
  });
}

test('CORS reflects only configured origins and allows multiple local/production origins', async (context) => {
  const origins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://coffee.example'];
  const url = await instance(context, getSecurityConfig({ CORS_ORIGINS: origins.join(',') }));
  for (const origin of origins) {
    const response = await fetch(url + '/api/health', { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
    assert.match(response.headers.get('vary'), /Origin/);
  }
});

test('CORS rejects unknown and null origins with safe JSON errors', async (context) => {
  const url = await instance(context);
  for (const origin of ['https://untrusted.example', 'http://localhost:5173.evil.example', 'null']) {
    const response = await fetch(url + '/api/health', { headers: { Origin: origin } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.match(response.headers.get('vary'), /Origin/);
    assert.deepEqual(await response.json(), { error: { code: 'CORS_ORIGIN_DENIED', message: 'Origin is not allowed.' } });
  }
});

test('CORS preflight allows Authorization and JSON without consuming authentication limits', async (context) => {
  const url = await instance(context, { ...getSecurityConfig({}), loginMax: 1 });
  for (let index = 0; index < 3; index += 1) {
    const response = await fetch(url + '/api/auth/login', {
      method: 'OPTIONS', headers: {
        Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Authorization,Content-Type',
      },
    });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('access-control-allow-headers'), /Authorization/);
    assert.match(response.headers.get('access-control-allow-headers'), /Content-Type/);
  }
  assert.equal((await attempt(url)).status, 400);
});

test('clients without Origin remain usable without wildcard CORS headers', async (context) => {
  const url = await instance(context);
  const response = await fetch(url + '/api/health');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.match(response.headers.get('vary'), /Origin/);
});

test('Helmet supplies API security headers and removes Express identification', async (context) => {
  const url = await instance(context);
  const response = await fetch(url + '/api/health');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('content-security-policy'), null);
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
});

test('login counts failed validation and emits standard rate/retry headers and JSON 429', async (context) => {
  const url = await instance(context, { ...getSecurityConfig({}), loginMax: 2 });
  assert.equal((await attempt(url)).status, 400);
  assert.equal((await attempt(url)).status, 400);
  const response = await attempt(url);
  assert.equal(response.status, 429);
  assert.ok(response.headers.get('ratelimit'));
  assert.ok(response.headers.get('ratelimit-policy'));
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.equal(response.headers.get('x-ratelimit-limit'), null);
  assert.deepEqual(await response.json(), { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' } });
});

test('Login and Register have independent counters and health is unaffected', async (context) => {
  const url = await instance(context, { ...getSecurityConfig({}), loginMax: 1, registerMax: 2 });
  assert.equal((await attempt(url)).status, 400);
  assert.equal((await attempt(url)).status, 429);
  assert.equal((await attempt(url, '/api/auth/register')).status, 400);
  assert.equal((await attempt(url, '/api/auth/register')).status, 400);
  assert.equal((await attempt(url, '/api/auth/register')).status, 429);
  for (let index = 0; index < 4; index += 1) assert.equal((await fetch(url + '/api/health')).status, 200);
});

test('wrong credentials and successful logins both count toward the same limit', async (context) => {
  configureAuth(context);
  const user = new User({ name: 'Test User', username: 'test_user', email: 'user@example.com', passwordHash: await bcrypt.hash('ExamplePassword123!', 10) });
  const query = mockUserQuery(context, 'findOne', user);
  const url = await instance(context, { ...getSecurityConfig({}), loginMax: 2 });
  assert.equal((await attempt(url, undefined, { body: JSON.stringify({ email: user.email, password: 'WrongPassword123!' }) })).status, 401);
  assert.equal((await attempt(url, undefined, { body: JSON.stringify({ email: user.email, password: 'ExamplePassword123!' }) })).status, 200);
  assert.equal((await attempt(url, undefined, { body: JSON.stringify({ email: user.email, password: 'ExamplePassword123!' }) })).status, 429);
  assert.equal(query.mock.callCount(), 2);
});

test('malformed JSON, wrong Content-Type, and Express path variants cannot bypass the limit', async (context) => {
  const url = await instance(context, { ...getSecurityConfig({}), loginMax: 2 });
  assert.equal((await attempt(url, '/api/auth/login', { body: '{' })).status, 400);
  assert.equal((await attempt(url, '/api/auth/login', { headers: { 'Content-Type': 'text/plain' }, body: 'text' })).status, 415);
  assert.equal((await attempt(url, '/API/AUTH/LOGIN/')).status, 429);
});

test('untrusted forwarded IP headers cannot bypass the socket-IP limit', async (context) => {
  context.mock.method(console, 'error', () => {});
  const url = await instance(context, { ...getSecurityConfig({}), loginMax: 1 });
  assert.equal((await attempt(url, undefined, { headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.1' } })).status, 400);
  assert.equal((await attempt(url, undefined, { headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.2' } })).status, 429);
});

test('trusted explicit proxies allow per-IPv4 clients and group IPv6 addresses by subnet', async (context) => {
  const url = await instance(context, getSecurityConfig({ TRUST_PROXY: '127.0.0.1/32,::1/128', LOGIN_RATE_LIMIT_MAX: '1' }));
  const forwarded = (ip) => attempt(url, '/api/auth/login', { headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip } });
  assert.equal((await forwarded('203.0.113.1')).status, 400);
  assert.equal((await forwarded('203.0.113.2')).status, 400);
  assert.equal((await forwarded('203.0.113.1')).status, 429);
  assert.equal((await forwarded('2001:db8:1234:5600::1')).status, 400);
  assert.equal((await forwarded('2001:db8:1234:5600::2')).status, 429);
  assert.equal((await forwarded('2001:db8:9999:5600::1')).status, 400);
});

test('limiter windows reset and separate app instances never share counters', async (context) => {
  const config = { ...getSecurityConfig({}), loginMax: 1, windowMs: 500 };
  const first = await instance(context, config);
  const second = await instance(context, config);
  assert.equal((await attempt(first)).status, 400);
  assert.equal((await attempt(first)).status, 429);
  assert.equal((await attempt(second)).status, 400);
  await setTimeout(550);
  assert.equal((await attempt(first)).status, 400);
});

test('JSON parser enforces the configured size and the API survives invalid payloads', async (context) => {
  const url = await instance(context, { ...getSecurityConfig({}), jsonLimitBytes: 64 });
  const response = await attempt(url, '/api/auth/register', { body: JSON.stringify({ password: 'private-canary'.repeat(20) }) });
  assert.equal(response.status, 413);
  assert.doesNotMatch(JSON.stringify(await response.json()), /private-canary|stack/);
  assert.equal((await attempt(url, '/api/auth/register', { body: '{' })).status, 400);
  assert.equal((await fetch(url + '/api/health')).status, 200);
});

const validEnv = () => ({ MONGODB_URI: 'mongodb://127.0.0.1:27017/unused', JWT_SECRET: randomBytes(32).toString('hex') });
test('valid startup configuration accepts legacy MongoDB URIs without returning secrets', () => {
  const env = validEnv();
  const result = validateStartupConfig(env);
  assert.equal(result.port, 3000);
  assert.equal(result.security.loginMax, 10);
  assert.equal(result.security.registerMax, 5);
  assert.equal(result.security.trustProxy, false);
  assert.ok(!JSON.stringify(result).includes(env.JWT_SECRET));
  assert.ok(!JSON.stringify(result).includes(env.MONGODB_URI));
});

const invalidConfig = [
  ['MONGODB_URI', undefined], ['MONGODB_URI', 'postgres://private:secret@internal/db'],
  ['JWT_SECRET', undefined], ['JWT_SECRET', 'short'], ['JWT_SECRET', 'x'.repeat(64)],
  ['JWT_SECRET', 'change-me-this-secret-is-only-a-placeholder'],
  ['JWT_EXPIRES_IN', 'invalid'], ['JWT_EXPIRES_IN', '0d'], ['JWT_EXPIRES_IN', ''],
  ['BCRYPT_ROUNDS', '9'], ['BCRYPT_ROUNDS', '15'], ['BCRYPT_ROUNDS', '12.5'], ['BCRYPT_ROUNDS', ''],
  ['PORT', '0'], ['PORT', '65536'], ['PORT', 'not-a-port'],
  ['CORS_ORIGINS', '*'], ['CORS_ORIGINS', ''], ['CORS_ORIGINS', 'null'],
  ['CORS_ORIGINS', 'http://localhost:5173,'], ['CORS_ORIGINS', 'https://example.com/path'],
  ['CORS_ORIGINS', 'https://user:secret@example.com'], ['CORS_ORIGINS', 'ftp://example.com'],
  ['LOGIN_RATE_LIMIT_MAX', '0'], ['REGISTER_RATE_LIMIT_MAX', '-1'],
  ['AUTH_RATE_LIMIT_WINDOW_MS', 'Infinity'], ['AUTH_RATE_LIMIT_WINDOW_MS', '2147483648'],
  ['JSON_BODY_LIMIT_BYTES', '0'], ['JSON_BODY_LIMIT_BYTES', '1048577'],
  ['TRUST_PROXY', 'true'], ['TRUST_PROXY', '1'], ['TRUST_PROXY', '0.0.0.0/0'], ['TRUST_PROXY', '::/0'], ['TRUST_PROXY', '127.0.0.1/99'],
];
for (const [index, [key, value]] of invalidConfig.entries()) {
  test(`startup rejects invalid ${key} configuration case ${index + 1} safely`, () => {
    const env = { ...validEnv(), [key]: value };
    assert.throws(() => validateStartupConfig(env), (error) => {
      assert.ok(error.code);
      assert.ok(!error.message.includes(env.JWT_SECRET || 'not-a-secret'));
      assert.ok(!error.message.includes(env.MONGODB_URI || 'not-a-uri'));
      return true;
    });
  });
}

test('production requires an explicit CORS allowlist', () => {
  assert.throws(() => getSecurityConfig({ NODE_ENV: 'production' }), { code: 'SECURITY_CONFIG_ERROR' });
});

test('the real server rejects a missing JWT secret before attempting database startup', async () => {
  await assert.rejects(promisify(execFile)(process.execPath, ['src/server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), timeout: 5000,
    env: { ...process.env, JWT_SECRET: '', MONGODB_URI: 'mongodb://127.0.0.1:1/unused' },
  }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /AUTH_CONFIG_ERROR/);
    assert.doesNotMatch(error.stderr, /mongodb:\/\/|stack| at /);
    assert.doesNotMatch(error.stdout, /MongoDB connected|API running/);
    return true;
  });
});
