import AppError from '../utils/AppError.js';

export function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  const lifetime = process.env.JWT_EXPIRES_IN || '1d';
  const duration = /^([1-9]\d*)(s|m|h|d)$/.exec(lifetime);
  const factors = { s: 1, m: 60, h: 3600, d: 86400 };
  const expiresIn = duration ? Number(duration[1]) * factors[duration[2]] : NaN;

  if (typeof secret !== 'string' || Buffer.byteLength(secret.trim(), 'utf8') < 32
    || !Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
    throw new AppError('Authentication configuration is invalid.', 500, 'AUTH_CONFIG_ERROR');
  }

  return { secret, expiresIn };
}

export function getBcryptRounds() {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 14) {
    throw new AppError('Password hashing configuration is invalid.', 500, 'AUTH_CONFIG_ERROR');
  }
  return rounds;
}
