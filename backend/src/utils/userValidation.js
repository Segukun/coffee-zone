import AppError from './AppError.js';
import { hasLength, isType } from './validationUtils.js';

export function isValidName(value) {
  return isType(value, 'string') && hasLength(value, { min: 2, max: 80 });
}

export function isValidUsername(value) {
  return isType(value, 'string') && hasLength(value, { min: 3, max: 30 }) && /^[a-z0-9_]+$/.test(value);
}

export function normalizeUsername(value) {
  const username = isType(value, 'string') ? value.trim().toLowerCase() : '';
  if (!isValidUsername(username)) {
    throw new AppError('Invalid username.', 400, 'VALIDATION_ERROR', [
      { field: 'username', message: 'Username must contain 3 to 30 letters, numbers, or underscores.' },
    ]);
  }
  return username;
}

function isAvatarUrl(value) {
  if (value === '') return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname)
      && !url.username && !url.password && !/\s/.test(value);
  } catch {
    return false;
  }
}

export function validateProfileUpdate(input) {
  const allowedFields = ['name', 'username', 'bio', 'avatar'];
  if (!isType(input, 'object') || Object.keys(input).length === 0
    || Object.keys(input).some((field) => !allowedFields.includes(field))) {
    throw new AppError('Provide only editable profile fields: name, username, bio, avatar.', 400, 'VALIDATION_ERROR');
  }
  const update = {};
  const details = [];
  for (const field of Object.keys(input)) {
    if (!isType(input[field], 'string')) {
      details.push({ field, message: 'This field must be a string.' });
      continue;
    }
    const value = input[field].trim();
    if (field === 'name' && !isValidName(value)) {
      details.push({ field, message: 'Name must contain between 2 and 80 characters.' });
    }
    if (field === 'username' && !isValidUsername(value.toLowerCase())) {
      details.push({ field, message: 'Username must contain 3 to 30 letters, numbers, or underscores.' });
    }
    if (field === 'bio' && !hasLength(value, { max: 500 })) {
      details.push({ field, message: 'Bio must not exceed 500 characters.' });
    }
    if (field === 'avatar' && (!hasLength(value, { max: 2048 }) || !isAvatarUrl(value))) {
      details.push({ field, message: 'Avatar must be an HTTP or HTTPS URL of up to 2048 characters, or empty.' });
    }
    update[field] = field === 'username' ? value.toLowerCase() : value;
  }
  if (details.length) throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
  return update;
}
