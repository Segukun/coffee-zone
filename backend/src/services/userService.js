import User from '../models/User.js';
import bcrypt from 'bcrypt';
import { getBcryptRounds } from '../config/auth.js';
import { validateNewPassword, validatePasswordChange } from '../utils/authValidation.js';
import AppError from '../utils/AppError.js';
import { normalizeUsername, validateProfileUpdate } from '../utils/userValidation.js';
import { serializeOwnProfile, serializePublicProfile } from '../utils/userSerialization.js';

const ownFields = 'name username email bio avatar createdAt updatedAt';

export async function getOwnProfile(userId) {
  const user = await User.findById(userId).select(ownFields).exec();
  if (!user) throw new AppError('Profile not found.', 404, 'USER_NOT_FOUND');
  return { user: serializeOwnProfile(user) };
}

export async function getPublicProfile(value) {
  const username = normalizeUsername(value);
  const user = await User.findOne({ username }).collation({ locale: 'en', strength: 2 })
    .select('name username bio avatar createdAt').exec();
  if (!user) throw new AppError('Profile not found.', 404, 'USER_NOT_FOUND');
  return { user: serializePublicProfile(user) };
}

export async function updateOwnProfile(userId, input) {
  const update = validateProfileUpdate(input);
  if (update.username !== undefined) {
    const duplicate = await User.findOne({ username: update.username, _id: { $ne: userId } })
      .collation({ locale: 'en', strength: 2 }).select('_id').exec();
    if (duplicate) throw new AppError('Username is already in use.', 409, 'DUPLICATE_KEY');
  }
  const user = await User.findByIdAndUpdate(userId, { $set: update }, {
    returnDocument: 'after', runValidators: true,
  }).select(ownFields).exec();
  if (!user) throw new AppError('Profile not found.', 404, 'USER_NOT_FOUND');
  return { user: serializeOwnProfile(user) };
}

export async function changePassword(userId, input) {
  const { currentPassword, newPassword } = validatePasswordChange(input);
  const user = await User.findById(userId).select('+passwordHash').exec();
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
    throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
  }
  validateNewPassword(newPassword);
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AppError('New password must differ from the current password.', 400, 'VALIDATION_ERROR');
  }
  const passwordHash = await bcrypt.hash(newPassword, getBcryptRounds());
  const result = await User.updateOne(
    { _id: userId, passwordHash: user.passwordHash },
    { $set: { passwordHash } },
    { runValidators: true },
  ).exec();
  if (result.matchedCount === 0) {
    throw new AppError('Password changed during this request. Please retry.', 409, 'PASSWORD_UPDATE_CONFLICT');
  }
  return { message: 'Password updated successfully' };
}
