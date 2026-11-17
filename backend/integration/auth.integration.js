import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import User from '../src/models/User.js';
import authMiddleware from '../src/middlewares/authMiddleware.js';
import errorMiddleware from '../src/middlewares/errorMiddleware.js';
import getStartupDiagnostics from '../src/utils/startupDiagnostics.js';
import { configureAuth, post, serve } from '../test-support/authTestUtils.js';

test('authentication integration against a unique temporary MongoDB database', {
  timeout: 180000,
}, async (context) => {
  configureAuth(context);
  const databaseName = 'coffee_zone_auth_test_' + randomUUID().replaceAll('-', '');
  let http;
  let protectedHttp;
  let localMongo;
  let ownsDatabase = false;
  try {
    if (!process.env.MONGODB_TEST_URI) {
      localMongo = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1' } });
    }
    const uri = process.env.MONGODB_TEST_URI || localMongo.getUri();
    try {
      await mongoose.connect(uri, { dbName: databaseName, serverSelectionTimeoutMS: 10000 });
    } catch (error) {
      const { type, code, category } = getStartupDiagnostics(error);
      throw new Error(`Test database connection failed (${type}, ${code}, ${category}).`);
    }
    assert.equal(mongoose.connection.name, databaseName);
    ownsDatabase = true;
    console.log('Temporary test database: ' + databaseName);
    await User.init();
    http = await serve(app);
    const protectedApp = express();
    protectedApp.get('/protected', authMiddleware, (request, response) => response.json({ data: request.user }));
    protectedApp.use(errorMiddleware);
    protectedHttp = await serve(protectedApp);
    const credentials = { name: 'Integration User', username: 'integration_user', email: 'integration@example.com', password: 'IntegrationPassword123!' };
    let token;
    let userId;

    await context.test('register creates a real user in users with a bcrypt hash', async () => {
      const { response, body } = await post(http.url, '/api/auth/register', credentials);
      assert.equal(response.status, 201);
      assert.equal(User.collection.collectionName, 'users');
      userId = body.data.user.id;
      const stored = await User.findById(userId).select('+passwordHash');
      assert.ok(await bcrypt.compare(credentials.password, stored.passwordHash));
      assert.equal((await User.findById(userId)).passwordHash, undefined);
      assert.equal(body.data.user.passwordHash, undefined);
      assert.equal(body.data.token, undefined);
    });

    await context.test('email and username duplicates are rejected case-insensitively', async () => {
      for (const duplicate of [
        { ...credentials, username: 'different_user', email: credentials.email.toUpperCase() },
        { ...credentials, username: credentials.username.toUpperCase(), email: 'different@example.com' },
      ]) {
        assert.equal((await post(http.url, '/api/auth/register', duplicate)).response.status, 409);
      }
    });

    for (const field of ['username', 'email']) {
      await context.test(`simultaneous registrations hit the real unique ${field} index`, async (raceContext) => {
        const originalFindOne = User.findOne;
        let arrived = 0;
        let release;
        const barrier = new Promise((resolve) => { release = resolve; });
        raceContext.mock.method(User, 'findOne', function (...args) {
          const query = originalFindOne.apply(this, args);
          const originalExec = query.exec.bind(query);
          raceContext.mock.method(query, 'exec', async () => {
            let result;
            try {
              result = await originalExec();
            } catch (error) {
              release();
              throw error;
            }
            arrived += 1;
            if (arrived === 2) release();
            await barrier;
            return result;
          });
          return query;
        });
        const candidates = field === 'username'
          ? [{ username: 'racing_user', email: 'race1@example.com' }, { username: 'racing_user', email: 'race2@example.com' }]
          : [{ username: 'racing_email1', email: 'race@example.com' }, { username: 'racing_email2', email: 'race@example.com' }];
        const results = await Promise.all([
          post(http.url, '/api/auth/register', { ...credentials, ...candidates[0] }),
          post(http.url, '/api/auth/register', { ...credentials, ...candidates[1] }),
        ]);
        assert.deepEqual(results.map(({ response }) => response.status).sort(), [201, 409]);
        const failure = results.find(({ response }) => response.status === 409).body;
        assert.equal(failure.error.code, 'DUPLICATE_KEY');
        assert.deepEqual(failure.error.details, [{ field, message: 'This value is already in use.' }]);
        assert.equal(await User.countDocuments({ [field]: candidates[0][field] }), 1);
      });
    }

    await context.test('login returns an expiring JWT that protects an HTTP route', async () => {
      const { response, body } = await post(http.url, '/api/auth/login', { email: credentials.email.toUpperCase(), password: credentials.password });
      assert.equal(response.status, 200);
      token = body.data.token;
      const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      assert.equal(claims.sub, userId);
      assert.equal(claims.exp - claims.iat, 86400);
      assert.equal(body.data.user.passwordHash, undefined);
      const protectedResponse = await fetch(protectedHttp.url + '/protected', { headers: { Authorization: 'Bearer ' + token } });
      assert.equal(protectedResponse.status, 200);
      assert.deepEqual(await protectedResponse.json(), { data: { id: userId } });
    });

    await context.test('existing mixed-case documents remain readable and block duplicate registrations', async () => {
      await User.collection.insertOne({
        name: 'Legacy User', username: 'LegacyUser', email: 'Legacy@Example.com', passwordHash: await bcrypt.hash(credentials.password, 10), bio: '', avatar: '',
      });
      assert.equal((await post(http.url, '/api/auth/login', { email: 'legacy@example.com', password: credentials.password })).response.status, 200);
      assert.equal((await post(http.url, '/api/auth/register', { ...credentials, username: 'legacyuser', email: 'new@example.com' })).response.status, 409);
    });

    await context.test('deleting the test user invalidates access with its previous token', async () => {
      await User.deleteOne({ _id: userId });
      const response = await fetch(protectedHttp.url + '/protected', { headers: { Authorization: 'Bearer ' + token } });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
    });

    assert.equal((await fetch(http.url + '/api/health')).status, 200);
  } finally {
    await Promise.all([http?.close(), protectedHttp?.close()]);
    try {
      if (ownsDatabase && mongoose.connection.name === databaseName && databaseName.startsWith('coffee_zone_auth_test_')) {
        await mongoose.connection.dropDatabase();
        console.log('Removed temporary test database: ' + databaseName);
      }
    } finally {
      try {
        await mongoose.disconnect();
      } finally {
        await localMongo?.stop();
      }
    }
  }
});
