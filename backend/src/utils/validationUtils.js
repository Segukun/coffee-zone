export function isRequired(value) {
  return value !== undefined && value !== null
    && (typeof value !== 'string' || value.trim().length > 0);
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isType(value, expectedType) {
  switch (expectedType) {
    case 'array':
      return Array.isArray(value);
    case 'object':
      return value !== null && typeof value === 'object'
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string':
    case 'boolean':
      return typeof value === expectedType;
    default:
      throw new TypeError('Unsupported validation type.');
  }
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// HTTP identifiers must be 24-character hexadecimal strings, without coercion.
export function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export function hasLength(value, { min = 0, max = Infinity } = {}) {
  if (!Number.isInteger(min) || min < 0
    || (max !== Infinity && !Number.isInteger(max)) || max < min) {
    throw new RangeError('Length limits must be non-negative integers with max >= min.');
  }

  return (typeof value === 'string' || Array.isArray(value))
    && value.length >= min && value.length <= max;
}

export function validateRequiredFields(data, fields) {
  if (!isType(data, 'object')) {
    return [{ field: 'body', message: 'Request body must be an object.' }];
  }

  return fields
    .filter((field) => !Object.hasOwn(data, field) || !isRequired(data[field]))
    .map((field) => ({ field, message: 'This field is required.' }));
}
