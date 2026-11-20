import { after, before, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import errorMiddleware from '../src/middlewares/errorMiddleware.js';
import notFoundMiddleware from '../src/middlewares/notFoundMiddleware.js';
import AppError from '../src/utils/AppError.js';
import { validateRequiredFields } from '../src/utils/validationUtils.js';

const secret = 'do-not-leak-password-hash-token';
const internalMessage = `mongodb://private-user:${secret}@internal-host/database`;
const testApp = express();
testApp.use(express.json({ limit: '1kb' }));
testApp.post('/echo', (request, response) => response.json({ data: request.body }));
testApp.get('/controlled/:status', (request) => {
  throw new AppError('Controlled request error.', Number(request.params.status), 'CONTROLLED_ERROR');
});
testApp.get('/validation', () => {
  throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', validateRequiredFields({}, ['email']));
});
testApp.get('/controlled-details', () => {
  throw new AppError('Invalid request data.', 422, 'VALIDATION_ERROR', [
    { field: 'email', message: 'Invalid email address.', value: secret, document: { passwordHash: secret } },
    { field: '../' + secret, message: 'Invalid field.' },
    null,
  ]);
});
testApp.get('/mongoose-validation', async () => {
  const user = new User({ _id: secret, email: 'person@example.com', passwordHash: secret });
  user.invalidate('email', internalMessage, secret);
  await user.validate();
});
testApp.get('/mongoose-cast', () => {
  throw new mongoose.Error.CastError('ObjectId', secret, '_id');
});
testApp.get('/unsafe-cast-path', () => {
  throw new mongoose.Error.CastError('String', secret, internalMessage);
});
testApp.get('/duplicate/:field', (request) => {
  throw new mongoose.mongo.MongoServerError({
    code: 11000,
    message: internalMessage,
    keyPattern: { [request.params.field]: 1 },
    keyValue: { [request.params.field]: secret },
  });
});
testApp.get('/duplicate-key-value', () => {
  throw new mongoose.mongo.MongoServerError({ code: 11000, message: internalMessage, keyValue: { username: secret } });
});
testApp.get('/unexpected-db', () => {
  throw new mongoose.Error.MongooseServerSelectionError(internalMessage);
});
testApp.get('/unexpected', () => {
  throw new Error(internalMessage);
});
testApp.get('/async-error', async () => {
  await Promise.resolve();
  throw new AppError('Access denied.', 403, 'FORBIDDEN');
});
testApp.get('/async-unexpected', async () => {
  await Promise.resolve();
  throw new Error(internalMessage);
});
testApp.get('/primitive-error', () => Promise.reject(internalMessage));
testApp.get('/http-error/:status', (request) => {
  throw Object.assign(new Error(internalMessage), { status: Number(request.params.status) });
});
testApp.get('/http-status-code', () => {
  throw Object.assign(new Error(internalMessage), { statusCode: 429 });
});
testApp.get('/controlled-server-error', () => {
  throw new AppError(internalMessage, 503, secret, [{ field: 'passwordHash', message: secret }]);
});
testApp.use(notFoundMiddleware);
testApp.use(errorMiddleware);

let productionServer;
let isolatedServer;
let productionUrl;
let isolatedUrl;

async function listen(application) {
  const server = application.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function readError(url, status, options) {
  const response = await fetch(url, options);
  assert.equal(response.status, status);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ['error']);
  assert.equal(typeof body.error.message, 'string');
  assert.equal(typeof body.error.code, 'string');
  assert.equal(body.error.stack, undefined);
  assert.doesNotMatch(JSON.stringify(body), /do-not-leak|mongodb:\/\/|internal-host|private-user/);
  return body;
}

before(async () => {
  mock.method(console, 'error', () => {});
  ({ server: productionServer, url: productionUrl } = await listen(app));
  ({ server: isolatedServer, url: isolatedUrl } = await listen(testApp));
});

after(async () => {
  await Promise.all([productionServer, isolatedServer].filter(Boolean).map((server) => (
    new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  )));
  mock.restoreAll();
});

test('the production health endpoint retains its original successful response', async () => {
  const response = await fetch(`${productionUrl}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { status: 'ok', message: 'Coffee Zone API is running' } });
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

test('unknown production endpoints return a safe JSON 404 without echoing the URL', async () => {
  const body = await readError(`${productionUrl}/api/missing?token=${secret}`, 404);
  assert.deepEqual(body, { error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } });
});

test('malformed JSON is handled before routing, without exposing the parser body', async () => {
  const body = await readError(`${productionUrl}/api/missing`, 400, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: `{"password":"${secret}",`,
  });
  assert.deepEqual(body, { error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' } });
});

for (const status of [400, 401, 403, 404, 409, 418, 422, 429]) {
  test(`controlled errors preserve HTTP ${status}`, async () => {
    const body = await readError(`${isolatedUrl}/controlled/${status}`, status);
    assert.deepEqual(body, { error: { code: 'CONTROLLED_ERROR', message: 'Controlled request error.' } });
  });
}

test('validation helpers integrate with AppError and expose only field/message pairs', async () => {
  const body = await readError(`${isolatedUrl}/validation`, 400);
  assert.deepEqual(body.error.details, [{ field: 'email', message: 'This field is required.' }]);
  const detailedBody = await readError(`${isolatedUrl}/controlled-details`, 422);
  assert.deepEqual(detailedBody.error.details, [{ field: 'email', message: 'Invalid email address.' }]);
});

test('real Mongoose schema validation errors, including nested cast errors, become safe HTTP 400 responses', async () => {
  const body = await readError(`${isolatedUrl}/mongoose-validation`, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.ok(body.error.details.some(({ field, message }) => field === 'name' && message === 'This field is required.'));
  assert.ok(body.error.details.some(({ field, message }) => field === '_id' && message === 'Invalid value.'));
  assert.ok(body.error.details.some(({ field, message }) => field === 'email' && message === 'Invalid value.'));
});

test('Mongoose CastError responses omit raw values and unsafe field names', async () => {
  const body = await readError(`${isolatedUrl}/mongoose-cast`, 400);
  assert.equal(body.error.code, 'INVALID_VALUE');
  assert.deepEqual(body.error.details, [{ field: '_id', message: 'Invalid value.' }]);
  const unsafeBody = await readError(`${isolatedUrl}/unsafe-cast-path`, 400);
  assert.equal(unsafeBody.error.details, undefined);
});

for (const field of ['email', 'username', '_id']) {
  test(`MongoDB duplicate ${field} errors become HTTP 409 without exposing values`, async () => {
    const body = await readError(`${isolatedUrl}/duplicate/${field}`, 409);
    assert.equal(body.error.code, 'DUPLICATE_KEY');
    assert.deepEqual(body.error.details, [{ field, message: 'This value is already in use.' }]);
  });
}

test('duplicate errors hide non-public fields and support driver keyValue metadata', async () => {
  const body = await readError(`${isolatedUrl}/duplicate/passwordHash`, 409);
  assert.equal(body.error.details, undefined);
  const fallbackBody = await readError(`${isolatedUrl}/duplicate-key-value`, 409);
  assert.deepEqual(fallbackBody.error.details, [{ field: 'username', message: 'This value is already in use.' }]);
});

for (const path of ['/unexpected', '/unexpected-db', '/async-unexpected', '/primitive-error']) {
  test(`unexpected errors at ${path} return generic HTTP 500 responses`, async () => {
    const body = await readError(`${isolatedUrl}${path}`, 500);
    assert.deepEqual(body, { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' } });
  });
}

test('Express 5 propagates async controlled errors without an extra wrapper', async () => {
  const body = await readError(`${isolatedUrl}/async-error`, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('other HTTP error statuses remain intact but untrusted messages remain private', async () => {
  for (const status of [400, 401, 403, 404, 409, 412, 413, 415, 418, 422, 429, 503]) {
    await readError(`${isolatedUrl}/http-error/${status}`, status);
  }
  await readError(`${isolatedUrl}/http-status-code`, 429);
  for (const invalidStatus of [200, 399, 600]) {
    await readError(`${isolatedUrl}/http-error/${invalidStatus}`, 500);
  }
});

test('all server error responses suppress even controlled messages, codes, and details', async () => {
  const body = await readError(`${isolatedUrl}/controlled-server-error`, 503);
  assert.deepEqual(body, { error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' } });
});

test('JSON parser size and charset errors retain HTTP 413 and 415', async () => {
  await readError(`${isolatedUrl}/echo`, 413, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: secret.repeat(100) }),
  });
  await readError(`${isolatedUrl}/echo`, 415, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=unsupported' }, body: '{}',
  });
});

test('headers already sent are delegated without attempting a second response', () => {
  const error = new Error(internalMessage);
  let forwardedError;
  errorMiddleware(error, {}, { headersSent: true }, (value) => { forwardedError = value; });
  assert.equal(forwardedError, error);
});

test('health and valid requests still work after malformed and failed requests', async () => {
  await readError(`${productionUrl}/api/health`, 400, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  const healthResponse = await fetch(`${productionUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).data.status, 'ok');
  const response = await fetch(`${isolatedUrl}/echo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hello' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { message: 'hello' } });
});

test('server-error logs contain only safe operational metadata', () => {
  const calls = console.error.mock.calls;
  assert.ok(calls.length > 0);
  for (const { arguments: args } of calls) {
    assert.equal(args[0], 'Request failed with a server error.');
    assert.deepEqual(Object.keys(args[1]).sort(), ['method', 'statusCode']);
    assert.doesNotMatch(JSON.stringify(args), /do-not-leak|mongodb:\/\/|internal-host|private-user/);
  }
});
