import { isIP } from 'node:net';
import mongoose from 'mongoose';
import AppError from '../utils/AppError.js';
import { getBcryptRounds, getJwtConfig } from './auth.js';

function invalidConfiguration() {
  return new AppError('Security configuration is invalid.', 500, 'SECURITY_CONFIG_ERROR');
}

function positiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const text = String(value ?? fallback);
  const number = Number(text);
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw invalidConfiguration();
  }
  return number;
}

function corsOrigins(env) {
  const raw = env.CORS_ORIGINS ?? (env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://127.0.0.1:5173');
  return [...new Set(raw.split(',').map((value) => {
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash || url.hostname.includes('*')) {
        throw invalidConfiguration();
      }
      return url.origin;
    } catch {
      throw invalidConfiguration();
    }
  }))];
}

function trustedProxies(value) {
  if (value === undefined || value === 'false') return false;
  const proxies = value.split(',').map((part) => part.trim());
  for (const proxy of proxies) {
    const [address, prefix, extra] = proxy.split('/');
    const family = isIP(address);
    if (!family || extra !== undefined || (prefix !== undefined
      && (!/^\d+$/.test(prefix) || Number(prefix) < 1 || Number(prefix) > (family === 4 ? 32 : 128)))) {
      throw invalidConfiguration();
    }
  }
  return proxies;
}

export function getSecurityConfig(env = process.env) {
  return {
    corsOrigins: corsOrigins(env),
    loginMax: positiveInteger(env.LOGIN_RATE_LIMIT_MAX, 10),
    registerMax: positiveInteger(env.REGISTER_RATE_LIMIT_MAX, 5),
    windowMs: positiveInteger(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000, 2147483647),
    jsonLimitBytes: positiveInteger(env.JSON_BODY_LIMIT_BYTES, 16384, 1048576),
    trustProxy: trustedProxies(env.TRUST_PROXY),
  };
}

export function validateStartupConfig(env = process.env) {
  const uri = env.MONGODB_URI;
  if (typeof uri !== 'string' || !uri.trim()) {
    throw Object.assign(new Error('Database configuration is missing.'), { code: 'MONGODB_URI_MISSING' });
  }
  try {
    if (uri !== uri.trim()) throw invalidConfiguration();
    // The constructor validates the URI without opening a connection.
    new mongoose.mongo.MongoClient(uri);
  } catch {
    throw Object.assign(new Error('Database configuration is invalid.'), { code: 'MONGODB_URI_INVALID' });
  }
  getJwtConfig(env);
  getBcryptRounds(env);
  return { port: positiveInteger(env.PORT, 3000, 65535), security: getSecurityConfig(env) };
}
