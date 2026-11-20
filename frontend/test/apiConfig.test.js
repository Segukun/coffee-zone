import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { normalizeApiBaseUrl, buildApiUrl } from '../src/services/apiConfig.js';

test('base URL trims whitespace and duplicate path/trailing slashes without losing the API prefix', () => {
  const base = normalizeApiBaseUrl(' https://api.example.test//v1///api/// ');
  assert.equal(base, 'https://api.example.test/v1/api');
  assert.equal(buildApiUrl(base, '/users//me/'), 'https://api.example.test/v1/api/users/me');
  assert.equal(buildApiUrl(normalizeApiBaseUrl('https://api.example.test/'), '/health'), 'https://api.example.test/health');
});

for (const [label, value] of [
  ['empty', ''], ['relative', '/api'], ['non HTTP', 'file:///private'],
  ['embedded credentials', 'https://user:private-password@example.test/api'],
  ['query', 'https://example.test/api?private=value'], ['fragment', 'https://example.test/api#private'],
]) {
  test(`invalid base URL: ${label} fails without echoing configuration`, () => {
    assert.throws(() => normalizeApiBaseUrl(value), error => {
      assert.equal(error.code, 'INVALID_API_URL');
      assert.equal(error.status, null);
      assert.equal(error.message, 'API URL configuration is invalid.');
      assert.equal(error.cause, undefined);
      return true;
    });
  });
}

for (const path of ['/api/users/me', '//other.example.test/users', 'https://other.example.test/users', '../outside', '/%2e%2e/outside', '/users\\me', '/users?token=value', '/users#fragment', '/bad%encoding']) {
  test(`invalid API path cannot duplicate the base prefix or escape it: ${path}`, () => {
    assert.throws(() => buildApiUrl('https://api.example.test/api', path), { code: 'INVALID_REQUEST' });
  });
}

test('invalid query values are rejected without stringifying objects into URLs', () => {
  for (const query of [{ nested: {} }, { page: NaN }, ['not a record']]) {
    assert.throws(() => buildApiUrl('https://api.example.test/api', '/users', query), { code: 'INVALID_REQUEST' });
  }
});

test('Vite actually supplies VITE_API_URL to import.meta.env without loading local .env files', async context => {
  const previous = process.env.VITE_API_URL;
  process.env.VITE_API_URL = 'https://configured.example.test/custom/api///';
  let vite;
  context.after(async () => {
    try { await vite?.close(); } finally {
      if (previous === undefined) delete process.env.VITE_API_URL;
      else process.env.VITE_API_URL = previous;
    }
  });
  vite = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false, envDir: false, logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true } });
  const config = await vite.ssrLoadModule('/src/services/apiConfig.js');
  assert.equal(config.apiBaseUrl, 'https://configured.example.test/custom/api');
});
