import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import AppError from '../utils/AppError.js';

export function createCors(config) {
  const middleware = cors({
    origin(origin, callback) {
      if (!origin) return callback(null, false);
      if (config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new AppError('Origin is not allowed.', 403, 'CORS_ORIGIN_DENIED'));
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['RateLimit', 'RateLimit-Policy', 'Retry-After'],
    credentials: false,
    maxAge: 600,
  });
  return (request, response, next) => {
    response.vary('Origin');
    middleware(request, response, next);
  };
}

export function createAuthLimiter(config, limit, identifier) {
  return rateLimit({
    windowMs: config.windowMs,
    limit,
    identifier,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(request, response, next) {
      next(new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
    },
  });
}

export function requireJsonBody(request, response, next) {
  const hasBody = Number(request.get('Content-Length')) > 0 || request.get('Transfer-Encoding');
  if (hasBody && ['POST', 'PUT', 'PATCH'].includes(request.method) && !request.is('application/json')) {
    return next(new AppError('Content-Type must be application/json.', 415, 'UNSUPPORTED_MEDIA_TYPE'));
  }
  return next();
}
