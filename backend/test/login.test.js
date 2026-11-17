import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { configureAuth, mockUserQuery, post, serve } from '../test-support/authTestUtils.js';

const password = 'ExamplePassword123!';
let http;
let user;
before(async () => {
  http = await serve(app);
  user = new User({ name: 'Alex Morgan', username: 'alexcodes', email: 'alex@example.com', passwordHash: await bcrypt.hash(password, 10) });
});
after(async () => { await http.close(); });

test('Login returns a verified HS256 JWT with subject, issued-at, and configurable expiration', async (context) => {
  configureAuth(context);
  process.env.JWT_EXPIRES_IN = '2h';
  const query = mockUserQuery(context, 'findOne', user);
  const { response, body } = await post(http.url, '/api/auth/login', { email: ' ALEX@Example.com ', password });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(query.mock.calls[0].arguments[0], { email: user.email });
  const claims = jwt.verify(body.data.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'sub']);
  assert.equal(claims.sub, user.id);
  assert.equal(claims.exp - claims.iat, 7200);
  assert.equal(body.data.user.id, user.id);
  assert.equal(body.data.user.passwordHash, undefined);
  assert.equal(body.data.user.password, undefined);
  assert.doesNotMatch(JSON.stringify(body.data.user), /ExamplePassword|passwordHash|__v|_id/);
});

test('Login returns identical HTTP 401 errors for wrong passwords and unknown email addresses', async (context) => {
  configureAuth(context);
  let foundUser = user;
  mockUserQuery(context, 'findOne', () => foundUser);
  const wrongPassword = await post(http.url, '/api/auth/login', { email: user.email, password: 'WrongPassword123!' });
  foundUser = null;
  const unknownEmail = await post(http.url, '/api/auth/login', { email: 'unknown@example.com', password });
  assert.equal(wrongPassword.response.status, 401);
  assert.equal(unknownEmail.response.status, 401);
  assert.deepEqual(wrongPassword.body, unknownEmail.body);
  assert.deepEqual(wrongPassword.body, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
});

for (const [label, data] of [
  ['missing fields', {}], ['invalid email', { email: 'invalid', password }],
  ['object email', { email: { $ne: null }, password }], ['array password', { email: 'a@example.com', password: [] }],
  ['blank password', { email: 'a@example.com', password: ' ' }], ['overlong password', { email: 'a@example.com', password: 'a'.repeat(73) }],
  ['array body', []],
]) {
  test(`Login rejects ${label} with HTTP 400`, async (context) => {
    const query = mockUserQuery(context, 'findOne', null);
    const { response, body } = await post(http.url, '/api/auth/login', data);
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(query.mock.callCount(), 0);
  });
}

for (const [label, value] of [['missing', undefined], ['short', 'short'], ['blank', ' '.repeat(40)]]) {
  test(`Login safely rejects a ${label} JWT secret`, async (context) => {
    configureAuth(context);
    if (value === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = value;
    context.mock.method(console, 'error', () => {});
    const query = mockUserQuery(context, 'findOne', user);
    const { response, body } = await post(http.url, '/api/auth/login', { email: user.email, password });
    assert.equal(response.status, 500);
    assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(query.mock.callCount(), 0);
  });
}

test('Login rejects invalid expiration configuration without exposing the signing secret', async (context) => {
  configureAuth(context);
  process.env.JWT_EXPIRES_IN = 'invalid';
  context.mock.method(console, 'error', () => {});
  const { response, body } = await post(http.url, '/api/auth/login', { email: user.email, password });
  assert.equal(response.status, 500);
  assert.doesNotMatch(JSON.stringify(body), new RegExp(process.env.JWT_SECRET));
});

test('Login handles unexpected database failures through the global error middleware', async (context) => {
  configureAuth(context);
  context.mock.method(console, 'error', () => {});
  mockUserQuery(context, 'findOne', () => { throw new Error('private-connection-details'); });
  const { response, body } = await post(http.url, '/api/auth/login', { email: user.email, password });
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
  assert.doesNotMatch(JSON.stringify(body), /private-connection/);
});

test('Login supports legacy password hashes created before the registration minimum length', async (context) => {
  configureAuth(context);
  const legacy = new User({ ...user.toObject(), passwordHash: await bcrypt.hash('old', 10) });
  mockUserQuery(context, 'findOne', legacy);
  const { response } = await post(http.url, '/api/auth/login', { email: user.email, password: 'old' });
  assert.equal(response.status, 200);
});
