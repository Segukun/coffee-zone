import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { configureAuth, mockUserQuery, post, serve } from '../test-support/authTestUtils.js';

const input = { name: 'Alex Morgan', username: 'alexcodes', email: 'alex@example.com', password: 'ExamplePassword123!' };
let http;
before(async () => { http = await serve(app); });
after(async () => { await http.close(); });

test('Sign Up returns 201, normalizes identifiers, hashes the password, and exposes only public user fields', async (context) => {
  configureAuth(context);
  mockUserQuery(context, 'findOne', null);
  let storedUser;
  context.mock.method(User, 'create', async (data) => {
    storedUser = data;
    return new User(data);
  });
  const { response, body } = await post(http.url, '/api/auth/register', {
    ...input, name: '  Alex Morgan  ', username: '  AlexCodes  ', email: ' Alex@EXAMPLE.COM ', passwordHash: 'client-supplied-hash', admin: true,
  });
  assert.equal(response.status, 201);
  assert.equal(storedUser.name, input.name);
  assert.equal(storedUser.username, input.username);
  assert.equal(storedUser.email, input.email);
  assert.equal(storedUser.password, undefined);
  assert.equal(storedUser.admin, undefined);
  assert.notEqual(storedUser.passwordHash, input.password);
  assert.ok(await bcrypt.compare(input.password, storedUser.passwordHash));
  assert.equal(bcrypt.getRounds(storedUser.passwordHash), 10);
  assert.deepEqual(Object.keys(body.data), ['user']);
  assert.deepEqual(Object.keys(body.data.user).sort(), ['avatar', 'bio', 'email', 'id', 'name', 'username']);
  assert.equal(body.data.user.bio, '');
  assert.equal(body.data.user.avatar, '');
  assert.ok(mongoose.isObjectIdOrHexString(body.data.user.id));
  assert.doesNotMatch(JSON.stringify(body), /password|client-supplied-hash|ExamplePassword/);
});

const invalidCases = [
  ['missing fields', {}, ['name', 'username', 'email', 'password']],
  ['invalid email', { ...input, email: 'invalid' }, ['email']],
  ['wrong types', { name: {}, username: [], email: 42, password: false }, ['name', 'username', 'email', 'password']],
  ['blank strings', { ...input, name: ' ', password: '\t ' }, ['name', 'password']],
  ['short name', { ...input, name: 'A' }, ['name']],
  ['long name', { ...input, name: 'a'.repeat(81) }, ['name']],
  ['invalid username characters', { ...input, username: 'alex name' }, ['username']],
  ['short username', { ...input, username: 'ab' }, ['username']],
  ['long username', { ...input, username: 'a'.repeat(31) }, ['username']],
  ['long email', { ...input, email: 'a'.repeat(250) + '@example.com' }, ['email']],
  ['short password', { ...input, password: '1234567' }, ['password']],
  ['long ASCII password', { ...input, password: 'a'.repeat(73) }, ['password']],
  ['long multibyte password', { ...input, password: '🔒'.repeat(19) }, ['password']],
  ['array body', [], ['body']],
];
for (const [label, data, fields] of invalidCases) {
  test(`Sign Up rejects ${label} with HTTP 400 before database access`, async (context) => {
    const query = mockUserQuery(context, 'findOne', null);
    const { response, body } = await post(http.url, '/api/auth/register', data);
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    for (const field of fields) assert.ok(body.error.details.some((detail) => detail.field === field));
    assert.equal(query.mock.callCount(), 0);
    assert.doesNotMatch(JSON.stringify(body), /ExamplePassword/);
  });
}

for (const field of ['username', 'email']) {
  test(`Sign Up rejects an existing ${field} with HTTP 409`, async (context) => {
    configureAuth(context);
    const query = mockUserQuery(context, 'findOne', { _id: new mongoose.Types.ObjectId() });
    const create = context.mock.method(User, 'create', async () => { throw new Error('Must not create a duplicate.'); });
    const { response, body } = await post(http.url, '/api/auth/register', input);
    assert.equal(response.status, 409);
    assert.equal(body.error.code, 'DUPLICATE_KEY');
    assert.deepEqual(query.mock.calls[0].arguments[0], { $or: [{ email: input.email }, { username: input.username }] });
    assert.equal(create.mock.callCount(), 0);
  });
}

test('Sign Up forwards a concurrent MongoDB duplicate error to the global handler', async (context) => {
  configureAuth(context);
  mockUserQuery(context, 'findOne', null);
  context.mock.method(User, 'create', async () => {
    throw new mongoose.mongo.MongoServerError({ code: 11000, message: input.password, keyPattern: { email: 1 }, keyValue: { email: input.email } });
  });
  const { response, body } = await post(http.url, '/api/auth/register', input);
  assert.equal(response.status, 409);
  assert.equal(body.error.code, 'DUPLICATE_KEY');
  assert.deepEqual(body.error.details, [{ field: 'email', message: 'This value is already in use.' }]);
  assert.doesNotMatch(JSON.stringify(body), /alex@example.com|ExamplePassword/);
});

test('Sign Up returns a safe HTTP 500 for unexpected storage errors', async (context) => {
  configureAuth(context);
  context.mock.method(console, 'error', () => {});
  mockUserQuery(context, 'findOne', () => { throw new Error('private-database-credentials'); });
  const { response, body } = await post(http.url, '/api/auth/register', input);
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
  assert.doesNotMatch(JSON.stringify(body), /private-database/);
});

test('Sign Up accepts exactly 72 UTF-8 bytes and preserves meaningful password spaces', async (context) => {
  configureAuth(context);
  mockUserQuery(context, 'findOne', null);
  let hash;
  context.mock.method(User, 'create', async (data) => { hash = data.passwordHash; return new User(data); });
  const password = ' ' + 'é'.repeat(35) + ' ';
  assert.equal(Buffer.byteLength(password), 72);
  const { response } = await post(http.url, '/api/auth/register', { ...input, password });
  assert.equal(response.status, 201);
  assert.ok(await bcrypt.compare(password, hash));
  assert.equal(await bcrypt.compare(password.trim(), hash), false);
});
