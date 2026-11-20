export function validateLogin(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = 'Enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Enter your password.';
  }

  return errors;
}

export function validateRegister(values) {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = 'Enter your name.';
  }

  if (!values.username.trim()) {
    errors.username = 'Choose a username.';
  } else if (!/^[a-zA-Z0-9_]+$/.test(values.username.trim())) {
    errors.username = 'Use only letters, numbers and underscores, without @.';
  }

  Object.assign(errors, validateLogin(values));

  if (values.password && (values.password.length < 8 || !/[a-zA-Z]/.test(values.password) || !/[0-9]/.test(values.password))) {
    errors.password = 'Use at least 8 characters, including a letter and a number.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function validatePasswordChange(values) {
  const errors = {};

  if (!values.currentPassword) {
    errors.currentPassword = 'Enter your current password.';
  }

  if (!values.newPassword) {
    errors.newPassword = 'Enter your new password.';
  } else if (values.newPassword.length < 8 || !/[a-zA-Z]/.test(values.newPassword) || !/[0-9]/.test(values.newPassword)) {
    errors.newPassword = 'Use at least 8 characters, including a letter and a number.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.';
  } else if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}
