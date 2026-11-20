import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import connectDatabase from '../src/config/database.js';

const execFileAsync = promisify(execFile);

function restoreMongoUri(previousValue) {
  if (previousValue === undefined) {
    delete process.env.MONGODB_URI;
  } else {
    process.env.MONGODB_URI = previousValue;
  }
}

test('database configuration rejects a missing URI before connecting', async (context) => {
  const previousValue = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  const connectMock = context.mock.method(mongoose, 'connect', async () => {});
  try {
    await assert.rejects(connectDatabase(), /MONGODB_URI is not defined/);
    assert.equal(connectMock.mock.callCount(), 0);
  } finally {
    restoreMongoUri(previousValue);
  }
});

test('database startup still passes the configured URI to Mongoose (mocked, no network)', async (context) => {
  const previousValue = process.env.MONGODB_URI;
  const testUri = 'mongodb://test.invalid/coffee-zone';
  process.env.MONGODB_URI = testUri;
  const connectMock = context.mock.method(mongoose, 'connect', async () => mongoose);
  context.mock.method(console, 'log', () => {});
  try {
    await connectDatabase();
    assert.equal(connectMock.mock.callCount(), 1);
    assert.deepEqual(connectMock.mock.calls[0].arguments, [testUri]);
  } finally {
    restoreMongoUri(previousValue);
  }
});

test('the real entry point loads ES modules and reports missing configuration safely', async () => {
  await assert.rejects(execFileAsync(process.execPath, ['src/server.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, MONGODB_URI: '', DOTENV_CONFIG_QUIET: 'true' },
    timeout: 5000,
  }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /Failed to start server: check the database configuration and availability\./);
    assert.match(error.stderr, /MONGODB_URI_MISSING/);
    assert.match(error.stderr, /CONFIGURATION_ERROR/);
    assert.doesNotMatch(error.stderr, /require is not defined|ReferenceError|mongodb:\/\/| at /);
    return true;
  });
});
