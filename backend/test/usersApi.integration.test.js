import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { getSecurityConfig } from '../src/config/security.js';
import User from '../src/models/User.js';
import { configureAuth, serve } from '../test-support/authTestUtils.js';

test('users API contract against isolated local MongoDB', { timeout: 180000 }, async (context) => {
  configureAuth(context);
  const password = 'OriginalPassword123!';
  const replacement = 'ReplacementPassword456!';
  const candidate = { name: 'New User', username: 'new_user', email: 'new@example.com', password };
  let mongo;
  let http;
  let owner;
  let other;
  let token;
  try {
    // Deliberately ignore MONGODB_URI and MONGODB_TEST_URI: this suite owns its local process.
    mongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
    await mongoose.connect(mongo.getUri(), { dbName: 'coffee_zone_users_api_tests' });
    await User.init();
    const hash = await bcrypt.hash(password, 10);
    // Keep real middleware; functional cases must not consume the normal 5/10 request limits.
    // Boundary behavior is covered by security.test.js with independent app instances.
    http = await serve(createApp({ ...getSecurityConfig({}), registerMax: 1000, loginMax: 1000 }));
    context.beforeEach(async () => {
      await User.deleteMany({});
      [owner, other] = await User.create([
        { name: 'Owner User', username: 'owner', email: 'owner@example.com', passwordHash: hash, bio: 'Owner bio' },
        { name: 'Other User', username: 'other', email: 'other@example.com', passwordHash: hash, bio: 'Other bio' },
      ]);
      token = jwt.sign({}, process.env.JWT_SECRET, { algorithm: 'HS256', subject: owner.id, expiresIn: '1d' });
    });

    async function snapshot() {
      return User.find().select('+passwordHash').sort('_id').lean().exec();
    }
    async function request(method, path, data, authorization) {
      const headers = {};
      if (data !== undefined) headers['Content-Type'] = 'application/json';
      if (authorization !== undefined) headers.Authorization = authorization;
      const response = await fetch(http.url + path, {
        method, headers, body: data === undefined ? undefined : JSON.stringify(data),
      });
      const body = await response.json();
      const serialized = JSON.stringify(body);
      assert.doesNotMatch(serialized, /"(?:passwordHash|password|currentPassword|newPassword|_id|__v)"\s*:/);
      assert.ok(!serialized.includes(password) && !serialized.includes(replacement));
      assert.ok(!serialized.includes(process.env.JWT_SECRET));
      return { response, body };
    }
    async function unchangedRejection(method, path, data, authorization, status, code) {
      const before = await snapshot();
      const result = await request(method, path, data, authorization);
      assert.equal(result.response.status, status);
      assert.equal(result.body.error.code, code);
      assert.deepEqual(await snapshot(), before, 'Rejected requests must preserve both complete documents');
      return result;
    }

    await context.test('HTTP workflow persists registration, profiles, password and existing JWT behavior', async () => {
      const untouched = await User.findById(other.id).select('+passwordHash').lean();
      const registered = await request('POST', '/api/auth/register', {
        ...candidate, name: ' New User ', username: ' NEW_USER ', email: ' New@Example.COM ',
        id: other.id, admin: true,
      });
      assert.equal(registered.response.status, 201);
      assert.deepEqual(Object.keys(registered.body.data.user).sort(), ['avatar', 'bio', 'email', 'id', 'name', 'username']);
      assert.equal(registered.body.data.token, undefined);
      const id = registered.body.data.user.id;
      const stored = await User.findById(id).select('+passwordHash').lean();
      assert.equal(stored.name, 'New User');
      assert.equal(stored.username, 'new_user');
      assert.equal(stored.email, 'new@example.com');
      assert.equal(stored.admin, undefined);
      assert.notEqual(stored.passwordHash, password);
      assert.ok(await bcrypt.compare(password, stored.passwordHash));
      const login = await request('POST', '/api/auth/login', { email: ' NEW@EXAMPLE.COM ', password });
      assert.equal(login.response.status, 200);
      assert.equal(login.response.headers.get('cache-control'), 'no-store');
      const claims = jwt.verify(login.body.data.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      assert.equal(claims.sub, id);
      assert.equal(claims.exp - claims.iat, 86400);
      const authorization = 'Bearer ' + login.body.data.token;
      const own = await request('GET', '/api/users/me', undefined, authorization);
      assert.equal(own.response.status, 200);
      assert.deepEqual(Object.keys(own.body.data.user).sort(), ['avatar', 'bio', 'createdAt', 'email', 'id', 'name', 'updatedAt', 'username']);
      assert.equal(own.body.data.user.email, 'new@example.com');
      const publicProfile = await request('GET', '/api/users/NEW_USER');
      assert.equal(publicProfile.response.status, 200);
      assert.deepEqual(Object.keys(publicProfile.body.data.user).sort(), ['avatar', 'bio', 'createdAt', 'id', 'name', 'username']);
      const update = await request('PATCH', '/api/users/me', { bio: ' Updated bio ' }, authorization);
      assert.equal(update.response.status, 200);
      assert.equal(update.body.data.user.bio, 'Updated bio');
      const updated = await User.findById(id).select('+passwordHash').lean();
      for (const field of ['name', 'username', 'email', 'avatar', 'passwordHash']) assert.equal(updated[field], stored[field]);
      assert.equal(updated.createdAt.getTime(), stored.createdAt.getTime());
      assert.equal(updated.bio, 'Updated bio');
      const change = await request('PATCH', '/api/users/me/password', { currentPassword: password, newPassword: replacement }, authorization);
      assert.equal(change.response.status, 200);
      assert.deepEqual(change.body, { data: { message: 'Password updated successfully' } });
      const changed = await User.findById(id).select('+passwordHash').lean();
      assert.notEqual(changed.passwordHash, stored.passwordHash);
      assert.ok(await bcrypt.compare(replacement, changed.passwordHash));
      assert.ok(!await bcrypt.compare(password, changed.passwordHash));
      assert.equal((await request('POST', '/api/auth/login', { email: candidate.email, password })).response.status, 401);
      assert.equal((await request('POST', '/api/auth/login', { email: candidate.email, password: replacement })).response.status, 200);
      assert.equal((await request('GET', '/api/users/me', undefined, authorization)).response.status, 200);
      assert.deepEqual(await User.findById(other.id).select('+passwordHash').lean(), untouched);
    });

    for (const field of ['name', 'username', 'email', 'password']) {
      for (const variant of ['missing', 'blank', 'wrong type']) {
        await context.test(`registration ${field}: ${variant} creates no user`, async () => {
          const data = { ...candidate, [field]: variant === 'blank' ? '   ' : 42 };
          if (variant === 'missing') delete data[field];
          await unchangedRejection('POST', '/api/auth/register', data, undefined, 400, 'VALIDATION_ERROR');
        });
      }
    }
    for (const [label, fields] of [
      ['invalid email', { email: 'invalid' }],
      ['invalid username', { username: 'bad-name' }],
      ['short password', { password: 'short' }],
      ['oversized UTF-8 password', { password: '😀'.repeat(19) }],
      ['duplicate email', { email: ' OWNER@EXAMPLE.COM ' }],
      ['duplicate username', { username: ' OWNER ' }],
    ]) {
      await context.test(`registration ${label} creates no user`, async () => {
        const duplicate = label.startsWith('duplicate');
        await unchangedRejection('POST', '/api/auth/register', { ...candidate, ...fields }, undefined,
          duplicate ? 409 : 400, duplicate ? 'DUPLICATE_KEY' : 'VALIDATION_ERROR');
      });
    }

    for (const [label, data, status] of [
      ['wrong password', { email: 'owner@example.com', password: 'WrongPassword123!' }, 401],
      ['unknown email', { email: 'absent@example.com', password }, 401],
      ['missing data', {}, 400],
      ['invalid email', { email: 'invalid', password }, 400],
      ['wrong type', { email: 'owner@example.com', password: {} }, 400],
    ]) {
      await context.test(`login ${label} preserves storage`, async () => {
        const { body } = await unchangedRejection('POST', '/api/auth/login', data, undefined, status,
          status === 401 ? 'INVALID_CREDENTIALS' : 'VALIDATION_ERROR');
        if (status === 401) assert.equal(body.error.message, 'Invalid email or password');
      });
    }

    const protectedRoutes = [
      ['GET', '/api/users/me', undefined],
      ['PATCH', '/api/users/me', { bio: 'Must not be saved' }],
      ['PATCH', '/api/users/me/password', { currentPassword: password, newPassword: replacement }],
    ];
    for (const [method, path, data] of protectedRoutes) {
      for (const variant of ['missing token', 'malformed header', 'invalid JWT', 'wrong signature', 'expired JWT']) {
        await context.test(`${method} ${path}: ${variant} rejects and preserves storage`, async () => {
          const headers = {
            'missing token': undefined,
            'malformed header': 'Basic ' + token,
            'invalid JWT': 'Bearer not.a.jwt',
            'wrong signature': 'Bearer ' + jwt.sign({}, randomBytes(32).toString('hex'), { subject: owner.id, expiresIn: '1d' }),
            'expired JWT': 'Bearer ' + jwt.sign({}, process.env.JWT_SECRET, { subject: owner.id, expiresIn: -60 }),
          };
          await unchangedRejection(method, path, data, headers[variant], 401, 'UNAUTHORIZED');
        });
      }
    }

    for (const [label, suffix, data] of [
      ['profile by ID', () => '/' + other.id, { bio: 'Attack' }],
      ['profile by username', () => '/' + other.username, { bio: 'Attack' }],
      ['profile extra ID', () => '/me/' + other.id, { bio: 'Attack' }],
      ['password by ID', () => '/' + other.id + '/password', { currentPassword: password, newPassword: replacement }],
      ['password by username', () => '/' + other.username + '/password', { currentPassword: password, newPassword: replacement }],
    ]) {
      await context.test(`URL manipulation: ${label} cannot write either account`, async () => {
        await unchangedRejection('PATCH', '/api/users' + suffix(), data, 'Bearer ' + token, 404, 'NOT_FOUND');
      });
    }
    for (const [method, path, data] of protectedRoutes) {
      await context.test(`query manipulation: ${method} ${path} acts only on JWT owner`, async () => {
        const untouched = await User.findById(other.id).select('+passwordHash').lean();
        const query = new URLSearchParams({ id: other.id, _id: other.id, userId: other.id, username: other.username });
        const result = await request(method, path + '?' + query, data, 'Bearer ' + token);
        assert.equal(result.response.status, 200);
        if (method === 'GET') assert.equal(result.body.data.user.id, owner.id);
        else if (path.endsWith('/password')) {
          assert.ok(await bcrypt.compare(replacement, (await User.findById(owner.id).select('+passwordHash')).passwordHash));
        } else assert.equal((await User.findById(owner.id)).bio, data.bio);
        assert.deepEqual(await User.findById(other.id).select('+passwordHash').lean(), untouched);
      });
    }
    for (const [path, data] of protectedRoutes.filter(([method]) => method === 'PATCH').map(([, path, data]) => [path, data])) {
      for (const field of ['id', '_id', 'userId', 'email', 'username']) {
        await context.test(`body manipulation: ${path} rejects ${field} atomically`, async () => {
          const value = field === 'username' ? other.username : field === 'email' ? other.email : other.id;
          const duplicate = path === '/api/users/me' && field === 'username';
          await unchangedRejection('PATCH', path, { ...data, [field]: value }, 'Bearer ' + token,
            duplicate ? 409 : 400, duplicate ? 'DUPLICATE_KEY' : 'VALIDATION_ERROR');
        });
      }
    }
    for (const [label, data] of [
      ['invalid name', { name: '', bio: 'Must not be saved' }],
      ['invalid avatar', { avatar: 'javascript:alert(1)', name: 'Must not be saved' }],
      ['duplicate username', { username: ' OTHER ', name: 'Must not be saved' }],
    ]) {
      await context.test(`profile ${label} preserves complete documents`, async () => {
        const duplicate = label === 'duplicate username';
        await unchangedRejection('PATCH', '/api/users/me', data, 'Bearer ' + token,
          duplicate ? 409 : 400, duplicate ? 'DUPLICATE_KEY' : 'VALIDATION_ERROR');
      });
    }
  } finally {
    try {
      await http?.close();
    } finally {
      try { await mongoose.disconnect(); } finally { await mongo?.stop(); }
    }
  }
});
