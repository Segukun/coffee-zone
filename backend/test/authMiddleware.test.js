import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import authMiddleware from '../src/middlewares/authMiddleware.js';
import errorMiddleware from '../src/middlewares/errorMiddleware.js';
import { configureAuth, mockUserQuery, serve } from '../test-support/authTestUtils.js';

const application = express();
application.get('/protected', authMiddleware, (request, response) => response.json({ data: { user: request.user } }));
application.use(errorMiddleware);
const userId = new mongoose.Types.ObjectId();
let http;
before(async () => { http = await serve(application); });
after(async () => { await http.close(); });

function sign(options = {}, payload = {}) {
  return jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', subject: userId.toString(), expiresIn: '1d', ...options });
}

async function request(authorization) {
  const response = await fetch(http.url + '/protected', { headers: authorization ? { Authorization: authorization } : {} });
  return { response, body: await response.json() };
}

test('JWT middleware permits a valid token and assigns only the user identity to request.user', async (context) => {
  configureAuth(context);
  const query = mockUserQuery(context, 'findById', { _id: userId, passwordHash: 'private-hash', email: 'private@example.com' });
  const { response, body } = await request('Bearer ' + sign());
  assert.equal(response.status, 200);
  assert.deepEqual(body, { data: { user: { id: userId.toString() } } });
  assert.deepEqual(query.mock.calls[0].arguments, [userId.toString()]);
});

for (const header of [undefined, 'Basic token', 'Bearer', 'Bearer one two', 'Bearer not-a-jwt']) {
  test(`JWT middleware rejects a missing or malformed header (${header ?? 'missing'})`, async (context) => {
    configureAuth(context);
    const query = mockUserQuery(context, 'findById', null);
    const { response, body } = await request(header);
    assert.equal(response.status, 401);
    assert.deepEqual(body, { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
    assert.equal(query.mock.callCount(), 0);
  });
}

for (const [label, token] of [
  ['expired', () => sign({ expiresIn: -1 })],
  ['incorrect signature', () => jwt.sign({}, 'another-signing-key-for-tests-only', { subject: userId.toString(), expiresIn: '1d' })],
  ['wrong algorithm', () => sign({ algorithm: 'HS384' })],
  ['future activation', () => sign({ notBefore: '1h' })],
  ['invalid subject', () => sign({ subject: 'invalid-id' })],
  ['missing expiration', () => jwt.sign({}, process.env.JWT_SECRET, { subject: userId.toString() })],
  ['string payload', () => jwt.sign('invalid-payload', process.env.JWT_SECRET)],
  ['unsigned', () => jwt.sign({}, null, { algorithm: 'none', subject: userId.toString(), expiresIn: '1d' })],
]) {
  test(`JWT middleware rejects ${label} tokens without querying users`, async (context) => {
    configureAuth(context);
    const query = mockUserQuery(context, 'findById', null);
    const { response, body } = await request('Bearer ' + token());
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'UNAUTHORIZED');
    assert.equal(query.mock.callCount(), 0);
  });
}

test('JWT middleware rejects a token whose user has been deleted', async (context) => {
  configureAuth(context);
  mockUserQuery(context, 'findById', null);
  const { response, body } = await request('Bearer ' + sign());
  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'UNAUTHORIZED');
});

test('JWT middleware sends database failures to the global handler as safe HTTP 500 errors', async (context) => {
  configureAuth(context);
  context.mock.method(console, 'error', () => {});
  mockUserQuery(context, 'findById', () => { throw new Error('private-database-details'); });
  const { response, body } = await request('Bearer ' + sign());
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
  assert.doesNotMatch(JSON.stringify(body), /private-database/);
});

test('User schema excludes passwordHash by default and preserves unique identifier indexes', () => {
  assert.equal(User.schema.path('passwordHash').options.select, false);
  assert.equal(User.schema.path('username').options.lowercase, true);
  assert.equal(User.schema.path('username').options.unique, true);
  assert.equal(User.schema.path('email').options.unique, true);
});
