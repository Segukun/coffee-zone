import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/services/apiClient.js';
import authApi, { createAuthApi } from '../src/services/authApi.js';
import usersApi, { createUsersApi } from '../src/services/usersApi.js';
import { api, apiBaseUrl, ApiError } from '../src/services/api.js';

const contracts = [
  ['register', 'POST', '/auth/register', false, { name: 'Alex', username: 'alex', email: 'alex@example.test', password: 'FictitiousPassword123!' }],
  ['login', 'POST', '/auth/login', false, { email: 'alex@example.test', password: 'FictitiousPassword123!' }],
  ['getMe', 'GET', '/users/me', true, undefined],
  ['getPublicProfile', 'GET', '/users/Alex%20Codes', false, undefined],
  ['updateMe', 'PATCH', '/users/me', true, { bio: 'Developer' }],
  ['changePassword', 'PATCH', '/users/me/password', true, { currentPassword: 'FictitiousPassword123!', newPassword: 'ReplacementPassword456!' }],
];

for (const [name, method, path, auth, data] of contracts) {
  test(`${name} uses the real endpoint, method, body and required auth policy`, async context => {
    const fetchImpl = context.mock.fn(async () => new Response('{"data":{"result":"test"}}', { headers: { 'Content-Type': 'application/json' } }));
    const client = createApiClient({ baseUrl: 'https://api.example.test/api', fetchImpl, getToken: () => 'local-test-token' });
    const service = ['register', 'login'].includes(name) ? createAuthApi(client) : createUsersApi(client);
    const signal = new AbortController().signal;
    const options = { auth: !auth, signal, headers: { 'X-Request-ID': 'test' } };
    const result = name === 'getPublicProfile' ? await service[name]('Alex Codes', options)
      : data === undefined ? await service[name](options) : await service[name](data, options);
    assert.deepEqual(result, { data: { result: 'test' } });
    assert.equal(fetchImpl.mock.callCount(), 1);
    const [url, request] = fetchImpl.mock.calls[0].arguments;
    assert.equal(url, 'https://api.example.test/api' + path);
    assert.equal(request.method, method);
    assert.equal(request.body, data === undefined ? undefined : JSON.stringify(data));
    assert.equal(request.headers.get('Authorization'), auth ? 'Bearer local-test-token' : null);
    assert.equal(request.headers.get('X-Request-ID'), 'test');
    assert.equal(request.signal, signal);
  });
}

test('default services and compatibility exports are ready without performing requests on import', () => {
  assert.equal(typeof authApi.login, 'function');
  assert.equal(typeof usersApi.changePassword, 'function');
  assert.equal(typeof api.get, 'function');
  assert.ok(apiBaseUrl.startsWith('http'));
  assert.equal(new ApiError('test').name, 'ApiError');
});
