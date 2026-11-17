import AppError from './AppError.js';
import { hasLength, isEmail, isRequired, isType, validateRequiredFields } from './validationUtils.js';
import { isValidName, isValidUsername } from './userValidation.js';

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

function passwordDetails(password, field, minimum = 0) {
  const details = [];
  if (Buffer.byteLength(password, 'utf8') > 72) {
    details.push({ field, message: 'Password must not exceed 72 UTF-8 bytes.' });
  }
  if (!hasLength([...password], { min: minimum })) {
    details.push({ field, message: 'Password must contain at least 8 characters.' });
  }
  return details;
}

function credentialDetails(email, password, minimum = 0) {
  const details = [];
  if (!isEmail(email) || !hasLength(email, { max: 254 })) {
    details.push({ field: 'email', message: 'Enter a valid email address of up to 254 characters.' });
  }
  details.push(...passwordDetails(password, 'password', minimum));
  return details;
}

export function validateRegistration(input) {
  validateStringFields(input, ['name', 'username', 'email', 'password']);
  const name = input.name.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const details = credentialDetails(email, input.password, 8);

  if (!isValidName(name)) {
    details.push({ field: 'name', message: 'Name must contain between 2 and 80 characters.' });
  }
  if (!isValidUsername(username)) {
    details.push({ field: 'username', message: 'Username must contain 3 to 30 letters, numbers, or underscores.' });
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

export function validatePasswordChange(input) {
  const fields = ['currentPassword', 'newPassword'];
  validateStringFields(input, fields);
  if (Object.keys(input).some((field) => !fields.includes(field))) {
    throw new AppError('Only currentPassword and newPassword are allowed.', 400, 'VALIDATION_ERROR');
  }
  const details = passwordDetails(input.currentPassword, 'currentPassword');
  if (details.length) throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
  return { currentPassword: input.currentPassword, newPassword: input.newPassword };
}

export function validateNewPassword(password) {
  const details = passwordDetails(password, 'newPassword', 8);
  if (details.length) throw new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
}
