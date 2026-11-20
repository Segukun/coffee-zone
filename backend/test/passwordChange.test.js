import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { changePassword } from '../src/services/userService.js';
import { post, serve } from '../test-support/authTestUtils.js';

const currentPassword = 'CurrentPassword123!';
const newPassword = 'NewPassword456!';
let mongo;
let http;
let originalHash;
let owner;
let other;
let token;
before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.BCRYPT_ROUNDS = '10';
  mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'coffee_zone_password_tests' });
  await User.init();
  originalHash = await bcrypt.hash(currentPassword, 10);
  http = await serve(app);
});
beforeEach(async () => {
  await User.deleteMany({});
  owner = await User.create({ name: 'Owner User', username: 'owner', email: 'owner@example.com', passwordHash: originalHash, bio: 'Original bio', avatar: 'https://example.com/a.png' });
  other = await User.create({ name: 'Other User', username: 'other', email: 'other@example.com', passwordHash: originalHash });
  await User.collection.updateOne({ _id: owner._id }, { $set: { updatedAt: new Date('2020-01-01') } });
  token = jwt.sign({}, process.env.JWT_SECRET, { subject: owner.id, expiresIn: '1d', algorithm: 'HS256' });
});
after(async () => {
  try {
    await http?.close();
    await mongoose.disconnect();
  } finally {
    await mongo?.stop();
  }
});

async function patch(data = { currentPassword, newPassword }, authorization = 'Bearer ' + token, path = '/api/users/me/password') {
  const response = await fetch(http.url + path, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(data),
  });
  const body = await response.json();
  const json = JSON.stringify(body);
  for (const secret of [currentPassword, newPassword, originalHash, token]) assert.ok(!json.includes(secret));
  assert.equal(body.data?.passwordHash, undefined);
  return { response, body };
}
async function snapshot() {
  return User.findById(owner.id).select('+passwordHash').lean();
}

test('password change updates only the hash and updatedAt, returns a safe 200, and retains existing JWT access', async () => {
  const before = await snapshot();
  const otherBefore = await User.findById(other.id).select('+passwordHash').lean();
  const { response, body } = await patch();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(body, { data: { message: 'Password updated successfully' } });
  const after = await snapshot();
  assert.notEqual(after.passwordHash, before.passwordHash);
  assert.equal(bcrypt.getRounds(after.passwordHash), 10);
  assert.ok(await bcrypt.compare(newPassword, after.passwordHash));
  assert.equal(await bcrypt.compare(currentPassword, after.passwordHash), false);
  assert.ok(after.updatedAt > before.updatedAt);
  assert.deepEqual({ ...after, passwordHash: before.passwordHash, updatedAt: before.updatedAt }, before);
  assert.deepEqual(await User.findById(other.id).select('+passwordHash').lean(), otherBefore);
  assert.equal((await fetch(http.url + '/api/users/me', { headers: { Authorization: 'Bearer ' + token } })).status, 200);
});

for (const [label, authorization] of [
  ['missing JWT', () => undefined], ['invalid JWT', () => 'Bearer invalid'],
  ['expired JWT', () => 'Bearer ' + jwt.sign({}, process.env.JWT_SECRET, { subject: owner.id, expiresIn: -1 })],
]) {
  test(`password change rejects ${label} with 401`, async () => {
    const before = await snapshot();
    assert.equal((await patch(undefined, authorization() ?? '')).response.status, 401);
    assert.deepEqual(await snapshot(), before);
  });
}

const invalidBodies = [
  {}, [], { newPassword }, { currentPassword },
  { currentPassword: 42, newPassword }, { currentPassword, newPassword: {} },
  { currentPassword: '', newPassword }, { currentPassword, newPassword: '  ' },
  { currentPassword: '\t', newPassword }, { currentPassword, newPassword: '' },
  { currentPassword, newPassword: '1234567' },
  { currentPassword, newPassword: 'a'.repeat(73) },
  { currentPassword, newPassword: '🔒'.repeat(19) },
  { currentPassword: 'a'.repeat(73), newPassword },
  { currentPassword, newPassword: currentPassword },
  ...['id', '_id', 'username', 'email', 'passwordHash', 'confirmPassword', '$set', 'roles'].map((field) => ({ currentPassword, newPassword, [field]: 'forbidden' })),
];
for (const [index, data] of invalidBodies.entries()) {
  test(`password change rejects invalid or extra fields ${index + 1} without modifying storage`, async () => {
    const before = await snapshot();
    assert.equal((await patch(data)).response.status, 400);
    assert.deepEqual(await snapshot(), before);
  });
}

test('incorrect current password returns the required safe 401 error and preserves all data', async () => {
  const before = await snapshot();
  const { response, body } = await patch({ currentPassword: 'WrongPassword123!', newPassword });
  assert.equal(response.status, 401);
  assert.deepEqual(body, { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' } });
  assert.deepEqual(await snapshot(), before);
});
test('current password verification precedes the new password policy check', async () => {
  const { response, body } = await patch({ currentPassword: 'WrongPassword123!', newPassword: 'short' });
  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'INVALID_CURRENT_PASSWORD');
});
test('old password stops working in Login and the new password succeeds', async () => {
  assert.equal((await patch()).response.status, 200);
  const oldLogin = await post(http.url, '/api/auth/login', { email: owner.email, password: currentPassword });
  assert.equal(oldLogin.response.status, 401);
  const newLogin = await post(http.url, '/api/auth/login', { email: owner.email, password: newPassword });
  assert.equal(newLogin.response.status, 200);
  assert.equal(newLogin.body.data.user.id, owner.id);
});
test('password change preserves spaces and case and accepts exactly 72 UTF-8 bytes', async () => {
  const password = ' ' + 'É'.repeat(35) + ' ';
  assert.equal(Buffer.byteLength(password), 72);
  assert.equal((await patch({ currentPassword, newPassword: password })).response.status, 200);
  const stored = await snapshot();
  assert.ok(await bcrypt.compare(password, stored.passwordHash));
  assert.equal(await bcrypt.compare(password.trim(), stored.passwordHash), false);
  assert.equal(await bcrypt.compare(password.toLowerCase(), stored.passwordHash), false);
});
test('existing short passwords can be replaced with a password meeting the registration policy', async () => {
  await User.updateOne({ _id: owner.id }, { $set: { passwordHash: await bcrypt.hash('old', 10) } });
  assert.equal((await patch({ currentPassword: 'old', newPassword })).response.status, 200);
});
test('client identifiers cannot target a different account', async () => {
  const before = await User.findById(other.id).select('+passwordHash').lean();
  assert.equal((await patch({ currentPassword, newPassword, id: other.id })).response.status, 400);
  assert.equal((await patch(undefined, 'Bearer ' + token, '/api/users/' + other.id + '/password')).response.status, 404);
  assert.deepEqual(await User.findById(other.id).select('+passwordHash').lean(), before);
});
test('deleted JWT users get 401 and disappearance after authentication gets 404', async () => {
  await User.deleteOne({ _id: owner.id });
  assert.equal((await patch()).response.status, 401);
  await assert.rejects(changePassword(owner.id, { currentPassword, newPassword }), { statusCode: 404, code: 'USER_NOT_FOUND' });
});
test('concurrent changes cannot overwrite a password based on an obsolete hash', async (context) => {
  const original = User.updateOne;
  let arrived = 0;
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  context.mock.method(User, 'updateOne', function (...args) {
    const query = original.apply(this, args);
    const exec = query.exec.bind(query);
    context.mock.method(query, 'exec', async () => {
      arrived += 1;
      if (arrived === 2) release();
      await barrier;
      return exec();
    });
    return query;
  });
  const passwords = ['ConcurrentPassword1!', 'ConcurrentPassword2!'];
  const results = await Promise.all(passwords.map((password) => patch({ currentPassword, newPassword: password })));
  assert.deepEqual(results.map(({ response }) => response.status).sort(), [200, 409]);
  const winner = results.findIndex(({ response }) => response.status === 200);
  assert.equal(results[1 - winner].body.error.code, 'PASSWORD_UPDATE_CONFLICT');
  const stored = await snapshot();
  assert.ok(await bcrypt.compare(passwords[winner], stored.passwordHash));
  assert.equal(await bcrypt.compare(passwords[1 - winner], stored.passwordHash), false);
});
for (const phase of ['read', 'hash', 'write']) {
  test(`unexpected ${phase} failures return safe 500 responses without changing the password`, async (context) => {
    const before = await snapshot();
    const logs = context.mock.method(console, 'error', () => {});
    const fail = () => { throw new Error('private-password-database-secret'); };
    if (phase === 'read') context.mock.method(User, 'findById', fail);
    if (phase === 'hash') context.mock.method(bcrypt, 'hash', fail);
    if (phase === 'write') context.mock.method(User, 'updateOne', fail);
    const { response, body } = await patch();
    assert.equal(response.status, 500);
    assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.doesNotMatch(JSON.stringify(body), /private-password/);
    assert.doesNotMatch(JSON.stringify(logs.mock.calls), /private-password|CurrentPassword|NewPassword|passwordHash/);
    context.mock.restoreAll();
    assert.deepEqual(await snapshot(), before);
  });
}
