import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { getOwnProfile, updateOwnProfile } from '../src/services/userService.js';
import { serve } from '../test-support/authTestUtils.js';

let mongo;
let http;
let owner;
let other;
let token;
before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.JWT_EXPIRES_IN = '1d';
  mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
  await mongoose.connect(mongo.getUri(), { dbName: 'coffee_zone_profile_tests' });
  await User.init();
  http = await serve(app);
});
beforeEach(async () => {
  await User.deleteMany({});
  owner = await User.create({ name: 'Owner User', username: 'owner', email: 'owner@example.com', passwordHash: 'private-hash', bio: 'Original bio', avatar: 'https://example.com/a.png' });
  other = await User.create({ name: 'Other User', username: 'other', email: 'other@example.com', passwordHash: 'other-private-hash' });
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

async function request(path, { method = 'GET', data, authorization } = {}) {
  const headers = {};
  if (authorization) headers.Authorization = authorization;
  if (data !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(http.url + path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) });
  const body = await response.json();
  assert.doesNotMatch(JSON.stringify(body), /passwordHash|private-hash|__v/);
  return { response, body };
}
function patch(data) {
  return request('/api/users/me', { method: 'PATCH', data, authorization: 'Bearer ' + token });
}

test('own profile uses JWT identity and includes email and timestamps', async () => {
  const { response, body } = await request('/api/users/me?userId=' + other.id, { authorization: 'Bearer ' + token });
  assert.equal(response.status, 200);
  assert.equal(body.data.user.id, owner.id);
  assert.equal(body.data.user.email, owner.email);
  assert.ok(body.data.user.createdAt);
  assert.ok(body.data.user.updatedAt);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});
for (const method of ['GET', 'PATCH']) {
  for (const authorization of [undefined, 'Bearer invalid']) {
    test(`${method} /me rejects missing or invalid JWT`, async () => {
      assert.equal((await request('/api/users/me', { method, data: method === 'PATCH' ? { bio: 'new' } : undefined, authorization })).response.status, 401);
    });
  }
  test(`${method} /me rejects a deleted JWT user`, async () => {
    await User.deleteOne({ _id: owner.id });
    assert.equal((await request('/api/users/me', { method, authorization: 'Bearer ' + token })).response.status, 401);
  });
}
test('public profile works without JWT and exposes only the public projection', async () => {
  const { response, body } = await request('/api/users/OWNER');
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body.data.user).sort(), ['avatar', 'bio', 'createdAt', 'id', 'name', 'username']);
  assert.equal(body.data.user.id, owner.id);
});
test('unknown public profile returns 404', async () => {
  const { response, body } = await request('/api/users/missing');
  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'USER_NOT_FOUND');
});
test('invalid public username returns 400', async () => {
  assert.equal((await request('/api/users/invalid-name')).response.status, 400);
});
test('the reserved /me route requires authentication before the parameter route', async () => {
  assert.equal((await request('/api/users/me')).response.status, 401);
  assert.equal((await request('/api/users/ME')).response.status, 401);
});
test('legacy mixed-case public usernames remain readable', async () => {
  await User.collection.updateOne({ _id: owner._id }, { $set: { username: 'LegacyOwner' } });
  const { response, body } = await request('/api/users/legacyowner');
  assert.equal(response.status, 200);
  assert.equal(body.data.user.id, owner.id);
});
test('PATCH updates all editable fields and returns private profile and new timestamps', async () => {
  const past = new Date('2020-01-01');
  await User.collection.updateOne({ _id: owner._id }, { $set: { updatedAt: past } });
  const { response, body } = await patch({ name: ' Updated Name ', username: ' New_User ', bio: 'New bio', avatar: 'https://example.com/new.png' });
  assert.equal(response.status, 200);
  assert.equal(body.data.user.username, 'new_user');
  assert.equal(body.data.user.name, 'Updated Name');
  assert.equal(body.data.user.email, owner.email);
  assert.ok(new Date(body.data.user.updatedAt) > past);
  assert.equal(new Date(body.data.user.createdAt).getTime(), owner.createdAt.getTime());
  assert.equal((await User.findById(other.id)).name, other.name);
});
test('partial PATCH preserves unspecified fields and authentication data', async () => {
  assert.equal((await patch({ bio: 'Partial update' })).response.status, 200);
  const updated = await User.findById(owner.id).select('+passwordHash');
  assert.equal(updated.name, owner.name);
  assert.equal(updated.username, owner.username);
  assert.equal(updated.avatar, owner.avatar);
  assert.equal(updated.email, owner.email);
  assert.equal(updated.passwordHash, 'private-hash');
});
test('PATCH clears bio and avatar with empty strings and allows the current username', async () => {
  const { response, body } = await patch({ username: 'OWNER', bio: '', avatar: '' });
  assert.equal(response.status, 200);
  assert.equal(body.data.user.bio, '');
  assert.equal(body.data.user.avatar, '');
});
const invalidUpdates = [
  {}, [], { name: '' }, { name: ' ' }, { name: 'A' }, { name: 'a'.repeat(81) }, { name: 7 },
  { username: 'me' }, { username: 'ME' }, { username: 'a' }, { username: 'a'.repeat(31) }, { username: 'bad-name' }, { username: {} },
  { bio: null }, { bio: [] }, { bio: 'b'.repeat(501) },
  { avatar: false }, { avatar: 'invalid' }, { avatar: 'javascript:alert(1)' }, { avatar: 'ftp://example.com/a' },
  { avatar: 'https:example.com' }, { avatar: 'https://user:password@example.com/a' }, { avatar: 'https://example.com/' + 'a'.repeat(2048) },
  ...['_id', 'id', 'email', 'password', 'passwordHash', 'createdAt', 'updatedAt', 'roles', 'admin', '$set', 'name.first'].map((field) => ({ [field]: 'forbidden', bio: 'must not be saved' })),
];
for (const [index, data] of invalidUpdates.entries()) {
  test(`PATCH rejects invalid or unauthorized input ${index + 1} atomically`, async () => {
    const { response, body } = await patch(data);
    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal((await User.findById(owner.id)).bio, owner.bio);
  });
}
test('PATCH accepts HTTP URLs and validation length boundaries', async () => {
  const { response } = await patch({ name: 'ab', username: 'abc', bio: 'b'.repeat(500), avatar: 'http://example.com/a.png' });
  assert.equal(response.status, 200);
});
test('PATCH rejects a duplicate username including legacy uppercase values', async () => {
  await User.collection.updateOne({ _id: other._id }, { $set: { username: 'LegacyOther' } });
  const { response, body } = await patch({ username: 'legacyother' });
  assert.equal(response.status, 409);
  assert.equal(body.error.code, 'DUPLICATE_KEY');
});
test('service handles disappearance between JWT authentication and profile query', async () => {
  const id = new mongoose.Types.ObjectId().toString();
  await assert.rejects(getOwnProfile(id), { statusCode: 404 });
  await assert.rejects(updateOwnProfile(id, { bio: '' }), { statusCode: 404 });
});
test('unexpected profile database errors reach the global handler safely', async (context) => {
  context.mock.method(console, 'error', () => {});
  context.mock.method(User, 'findOne', () => { throw new Error('private-connection-details'); });
  const { response, body } = await request('/api/users/owner');
  assert.equal(response.status, 500);
  assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
  assert.doesNotMatch(JSON.stringify(body), /private-connection/);
});
test('PATCH storage failures return safe HTTP 500 responses', async (context) => {
  context.mock.method(console, 'error', () => {});
  context.mock.method(User, 'findByIdAndUpdate', () => { throw new Error('private-storage-details'); });
  assert.equal((await patch({ bio: 'new' })).response.status, 500);
});
test('concurrent partial updates preserve both independently edited fields', async () => {
  const results = await Promise.all([patch({ bio: 'Concurrent bio' }), patch({ name: 'Concurrent Name' })]);
  assert.ok(results.every(({ response }) => response.status === 200));
  const updated = await User.findById(owner.id);
  assert.equal(updated.bio, 'Concurrent bio');
  assert.equal(updated.name, 'Concurrent Name');
});
test('real unique index resolves concurrent username claims with HTTP 409', async (context) => {
  const original = User.findOne;
  let arrived = 0;
  let release;
  const barrier = new Promise((resolve) => { release = resolve; });
  context.mock.method(User, 'findOne', function (...args) {
    const query = original.apply(this, args);
    const exec = query.exec.bind(query);
    context.mock.method(query, 'exec', async () => {
      let result;
      try { result = await exec(); } catch (error) { release(); throw error; }
      arrived += 1;
      if (arrived === 2) release();
      await barrier;
      return result;
    });
    return query;
  });
  const otherToken = jwt.sign({}, process.env.JWT_SECRET, { subject: other.id, expiresIn: '1d' });
  const results = await Promise.all([
    patch({ username: 'claimed' }),
    request('/api/users/me', { method: 'PATCH', data: { username: 'claimed' }, authorization: 'Bearer ' + otherToken }),
  ]);
  assert.deepEqual(results.map(({ response }) => response.status).sort(), [200, 409]);
  const error = results.find(({ response }) => response.status === 409).body.error;
  assert.equal(error.code, 'DUPLICATE_KEY');
  assert.deepEqual(error.details, [{ field: 'username', message: 'This value is already in use.' }]);
  assert.equal(await User.countDocuments({ username: 'claimed' }), 1);
});
test('Sign Up also rejects the reserved username me', async () => {
  const { response } = await request('/api/auth/register', { method: 'POST', data: { name: 'New User', username: 'me', email: 'new@example.com', password: 'ExamplePassword123!' } });
  assert.equal(response.status, 400);
});
