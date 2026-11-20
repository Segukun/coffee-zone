import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { isObjectId } from '../utils/validationUtils.js';
import { validateLogin, validateRegistration } from '../utils/authValidation.js';
import { getBcryptRounds, getJwtConfig } from '../config/auth.js';
import { serializeAccount } from '../utils/userSerialization.js';

const identityCollation = { locale: 'en', strength: 2 };
const dummyHashes = new Map();

function getDummyHash(rounds) {
  if (!dummyHashes.has(rounds)) {
    dummyHashes.set(rounds, bcrypt.hash(randomBytes(32).toString('hex'), rounds));
  }
  return dummyHashes.get(rounds);
}

export async function registerUser(input) {
  const { name, username, email, password } = validateRegistration(input);
  const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    .collation(identityCollation).select('_id').exec();
  if (existingUser) {
    throw new AppError('Email or username is already in use.', 409, 'DUPLICATE_KEY');
  }

  const passwordHash = await bcrypt.hash(password, getBcryptRounds());
  // Unique indexes remain authoritative if concurrent registrations pass the precheck.
  const user = await User.create({ name, username, email, passwordHash });
  return { user: serializeAccount(user) };
}

export async function loginUser(input) {
  const { email, password } = validateLogin(input);
  const { secret, expiresIn } = getJwtConfig();
  const user = await User.findOne({ email }).collation(identityCollation).select('+passwordHash').exec();
  const passwordHash = user?.passwordHash || await getDummyHash(getBcryptRounds());
  const passwordMatches = await bcrypt.compare(password, passwordHash);
  if (!user || !passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign({}, secret, { algorithm: 'HS256', subject: user._id.toString(), expiresIn });
  return { token, user: serializeAccount(user) };
}

export async function authenticateToken(token) {
  const { secret } = getJwtConfig();
  let claims;
  try {
    claims = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
    }
    throw error;
  }

  if (!claims || typeof claims !== 'object' || !isObjectId(claims.sub) || !Number.isInteger(claims.exp)) {
    throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  }
  const user = await User.findById(claims.sub).select('_id').exec();
  if (!user) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');
  return { id: user._id.toString() };
}
