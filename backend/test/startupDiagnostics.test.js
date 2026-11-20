import test from 'node:test';
import assert from 'node:assert/strict';
import getStartupDiagnostics from '../src/utils/startupDiagnostics.js';

const secret = 'do-not-leak-credentials';

test('startup DNS diagnostics identify the SRV failure without logging hostnames or messages', () => {
  const error = Object.assign(new Error(`mongodb://user:${secret}@private-host/database`), {
    code: 'ECONNREFUSED', syscall: 'querySrv', hostname: `private-${secret}`, stack: secret,
  });
  const diagnostics = getStartupDiagnostics(error);
  assert.equal(diagnostics.type, 'Error');
  assert.equal(diagnostics.code, 'ECONNREFUSED');
  assert.equal(diagnostics.operation, 'querySrv');
  assert.equal(diagnostics.category, 'DNS_ERROR');
  assert.doesNotMatch(JSON.stringify(diagnostics), /do-not-leak|mongodb:\/\/|private-host/);
});

test('startup diagnostics expose missing configuration through a stable code', () => {
  const diagnostics = getStartupDiagnostics(Object.assign(new Error(secret), { code: 'MONGODB_URI_MISSING' }));
  assert.equal(diagnostics.category, 'CONFIGURATION_ERROR');
  assert.equal(diagnostics.code, 'MONGODB_URI_MISSING');
});

test('nested driver errors retain their type and code without serializing topology data', () => {
  const cause = Object.assign(new Error(secret), { code: 'ENOTFOUND', syscall: 'getaddrinfo' });
  const error = Object.assign(new Error(secret), {
    name: 'MongooseServerSelectionError',
    reason: { servers: new Map([[secret, { error: Object.assign(new Error(secret), { name: 'MongoNetworkError', cause }) }]]) },
  });
  const diagnostics = getStartupDiagnostics(error);
  assert.equal(diagnostics.type, 'MongooseServerSelectionError');
  assert.equal(diagnostics.category, 'DNS_ERROR');
  assert.ok(diagnostics.causes.some(({ code }) => code === 'ENOTFOUND'));
  assert.doesNotMatch(JSON.stringify(diagnostics), /do-not-leak/);
});

test('authentication, permission, URI, TLS, network, and port errors receive separate safe hints', () => {
  const cases = [
    [{ name: 'MongoServerError', code: 18 }, 'AUTHENTICATION_ERROR'],
    [{ name: 'MongoServerError', code: 8000, message: `bad auth: ${secret}` }, 'AUTHENTICATION_ERROR'],
    [{ name: 'MongoServerError', code: 13 }, 'PERMISSION_ERROR'],
    [{ name: 'MongoParseError' }, 'CONFIGURATION_ERROR'],
    [{ name: 'Error', code: 'CERT_HAS_EXPIRED' }, 'TLS_ERROR'],
    [{ name: 'Error', code: 'ECONNREFUSED', syscall: 'connect' }, 'NETWORK_ERROR'],
    [{ name: 'Error', code: 'EADDRINUSE' }, 'PORT_IN_USE'],
    [{ name: 'MongooseServerSelectionError' }, 'SERVER_SELECTION_ERROR'],
  ];
  for (const [error, category] of cases) {
    const diagnostics = getStartupDiagnostics(error);
    assert.equal(diagnostics.category, category);
    assert.doesNotMatch(JSON.stringify(diagnostics), /do-not-leak/);
  }
});

test('unknown names, codes, messages, and arbitrary fields cannot leak through startup diagnostics', () => {
  const diagnostics = getStartupDiagnostics({ name: secret, code: secret, message: secret, uri: secret });
  assert.equal(diagnostics.type, 'UnknownError');
  assert.equal(diagnostics.code, 'UNKNOWN');
  assert.equal(diagnostics.category, 'UNKNOWN_ERROR');
  assert.doesNotMatch(JSON.stringify(diagnostics), /do-not-leak/);
  assert.equal(getStartupDiagnostics(null).category, 'UNKNOWN_ERROR');
});

test('cyclic causes are bounded and startup stage is constrained', () => {
  const error = new Error(secret);
  error.cause = error;
  assert.equal(getStartupDiagnostics(error, 'http').stage, 'http');
  assert.equal(getStartupDiagnostics(error, secret).stage, 'database');
  assert.equal(getStartupDiagnostics(error).causes, undefined);
});
