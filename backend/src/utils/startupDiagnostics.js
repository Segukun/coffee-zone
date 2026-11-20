import { constants } from 'node:os';

const errorTypes = new Set([
  'Error', 'AppError', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'MongooseError',
  'MongooseServerSelectionError', 'MongoServerSelectionError', 'MongoServerError',
  'MongoParseError', 'MongoInvalidArgumentError', 'MongoAPIError', 'MongoNetworkError',
  'MongoNetworkTimeoutError', 'MongoTopologyClosedError', 'MongoRuntimeError',
]);
const dnsCodes = new Set(['ENOTFOUND', 'ENODATA', 'ESERVFAIL', 'EREFUSED', 'EAI_AGAIN', 'ETIMEOUT']);
const tlsCodes = new Set([
  'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'CERT_HAS_EXPIRED',
]);
const errorCodes = new Set([
  ...Object.keys(constants.errno), ...dnsCodes, ...tlsCodes, 'MONGODB_URI_MISSING',
  'MONGODB_URI_INVALID', 'AUTH_CONFIG_ERROR', 'SECURITY_CONFIG_ERROR',
]);
const operations = new Set(['querySrv', 'queryTxt', 'getaddrinfo', 'connect']);

function collectErrors(error) {
  const queue = [error];
  const seen = new Set();
  const errors = [];

  while (queue.length && errors.length < 8) {
    const current = queue.shift();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    errors.push(current);
    queue.push(current.cause);
    if (current.reason instanceof Error) queue.push(current.reason);
    if (current.reason?.servers instanceof Map) {
      for (const server of current.reason.servers.values()) queue.push(server.error);
    }
  }

  return errors;
}

function safeError(error) {
  const result = {
    type: errorTypes.has(error?.name) ? error.name : 'UnknownError',
    code: Number.isInteger(error?.code) || errorCodes.has(error?.code) ? error.code : 'UNKNOWN',
  };
  if (operations.has(error?.syscall)) result.operation = error.syscall;
  return result;
}

export default function getStartupDiagnostics(error, stage = 'database') {
  const errors = collectErrors(error);
  const records = errors.map(safeError);
  let category = 'UNKNOWN_ERROR';
  let hint = 'Check the reported error type and code. Do not print the connection string.';

  if (records.some(({ code }) => code === 'MONGODB_URI_MISSING')) {
    category = 'CONFIGURATION_ERROR';
    hint = 'Set MONGODB_URI in backend/.env or the process environment.';
  } else if (records.some(({ code }) => ['MONGODB_URI_INVALID', 'AUTH_CONFIG_ERROR', 'SECURITY_CONFIG_ERROR'].includes(code))) {
    category = 'CONFIGURATION_ERROR';
    hint = 'Review backend environment configuration, including authentication and security settings.';
  } else if (records.some(({ type }) => ['MongoParseError', 'MongoInvalidArgumentError'].includes(type))) {
    category = 'CONFIGURATION_ERROR';
    hint = 'Check the MongoDB connection string format and percent-encoding of credentials.';
  } else if (records.some(({ code, operation }) => dnsCodes.has(code) || ['querySrv', 'queryTxt', 'getaddrinfo'].includes(operation))) {
    category = 'DNS_ERROR';
    hint = 'Check the configured DNS resolver and VPN/firewall support for MongoDB SRV/TXT lookups.';
  } else if (errors.some((item) => item.code === 18 || (item.name === 'MongoServerError'
    && typeof item.message === 'string' && /authentication failed|bad auth|auth failed/i.test(item.message)))) {
    category = 'AUTHENTICATION_ERROR';
    hint = 'Check the database user, password, authSource, and credential percent-encoding in Atlas.';
  } else if (records.some(({ code }) => code === 13)) {
    category = 'PERMISSION_ERROR';
    hint = 'Check the database user roles for the selected database in Atlas.';
  } else if (records.some(({ code }) => tlsCodes.has(code))) {
    category = 'TLS_ERROR';
    hint = 'Check certificate trust and network TLS inspection. Keep certificate validation enabled.';
  } else if (records.some(({ code }) => code === 'EADDRINUSE')) {
    category = 'PORT_IN_USE';
    hint = 'Check whether another process is already using PORT.';
  } else if (records.some(({ code }) => ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH'].includes(code))) {
    category = 'NETWORK_ERROR';
    hint = 'Check network access, firewall/VPN rules, cluster availability, and the Atlas IP access list.';
  } else if (records.some(({ type }) => type.includes('ServerSelection'))) {
    category = 'SERVER_SELECTION_ERROR';
    hint = 'Check the nested error codes, cluster availability, network access, and the Atlas IP access list.';
  }

  return {
    stage: stage === 'http' ? 'http' : 'database',
    ...safeError(error),
    category,
    hint,
    ...(records.length > 1 ? { causes: records.slice(1) } : {}),
  };
}
