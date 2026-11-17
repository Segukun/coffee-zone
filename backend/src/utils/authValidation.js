import AppError from './AppError.js';
import { hasLength, isEmail, isRequired, isType, validateRequiredFields } from './validationUtils.js';

function validateStringFields(input, fields) {
  const details = validateRequiredFields(input, fields);
  if (isType(input, 'object')) {
    for (const field of fields) {
      if (isRequired(input[field]) && !isType(input[field], 'string')) {
        details.push({ field, message: 'This field must be a string.' });
      }
    }
  }
  if (details.length) throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
}

function credentialDetails(email, password) {
  const details = [];
  if (!isEmail(email) || !hasLength(email, { max: 254 })) {
    details.push({ field: 'email', message: 'Enter a valid email address of up to 254 characters.' });
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    details.push({ field: 'password', message: 'Password must not exceed 72 UTF-8 bytes.' });
  }
  return details;
}

export function validateRegistration(input) {
  validateStringFields(input, ['name', 'username', 'email', 'password']);
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const details = credentialDetails(email, input.password);

  if (!hasLength(name, { min: 2, max: 80 })) {
    details.push({ field: 'name', message: 'Name must contain between 2 and 80 characters.' });
  }
  if (!hasLength(username, { min: 3, max: 30 }) || !/^[a-z0-9_]+$/.test(username)) {
    details.push({ field: 'username', message: 'Username must contain 3 to 30 letters, numbers, or underscores.' });
  }
  if (!hasLength([...input.password], { min: 8 })) {
    details.push({ field: 'password', message: 'Password must contain at least 8 characters.' });
  }
  if (details.length) throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);

  return { name, username, email, password: input.password };
}

export function validateLogin(input) {
  validateStringFields(input, ['email', 'password']);
  const email = input.email.trim().toLowerCase();
  const details = credentialDetails(email, input.password);
  if (details.length) throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
  return { email, password: input.password };
}
