import test from 'node:test';
import assert from 'node:assert/strict';
import AppError from '../src/utils/AppError.js';
import {
  isRequired,
  isNonEmptyString,
  isType,
  isEmail,
  isObjectId,
  hasLength,
  validateRequiredFields,
} from '../src/utils/validationUtils.js';

test('required values reject missing and blank input, but accept zero and false', () => {
  for (const value of [undefined, null, '', '   ', '\t\n']) {
    assert.equal(isRequired(value), false);
  }
  for (const value of ['hello', 0, false, [], {}]) {
    assert.equal(isRequired(value), true);
  }
});

test('non-empty strings reject whitespace and non-string types without coercion', () => {
  for (const value of [undefined, null, '', ' \t ', 12, false, [], {}]) {
    assert.equal(isNonEmptyString(value), false);
  }
  assert.equal(isNonEmptyString(' hello '), true);
});

test('type validation distinguishes objects, arrays, null, primitives, and finite numbers', () => {
  const cases = [
    ['hello', 'string', true], [12, 'string', false],
    [false, 'boolean', true], ['false', 'boolean', false],
    [0, 'number', true], [NaN, 'number', false],
    [Infinity, 'number', false], ['12', 'number', false],
    [[], 'array', true], [{}, 'array', false],
    [{}, 'object', true], [Object.create(null), 'object', true],
    [null, 'object', false], [[], 'object', false], [new Date(), 'object', false],
  ];
  for (const [value, type, expected] of cases) {
    assert.equal(isType(value, type), expected);
  }
  assert.throws(() => isType('value', 'unsupported'), TypeError);
});

test('basic email validation accepts ordinary addresses and rejects malformed input', () => {
  for (const value of ['developer@example.com', 'dev+coffee@sub.example.org']) {
    assert.equal(isEmail(value), true);
  }
  for (const value of [null, undefined, 42, [], '', 'dev', 'dev@host', '@example.com', 'a@@b.com', 'a b@example.com', ' dev@example.com', 'dev@example.com ']) {
    assert.equal(isEmail(value), false);
  }
});

test('HTTP ObjectIds must be exactly 24 hexadecimal characters', () => {
  assert.equal(isObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isObjectId('507F1F77BCF86CD799439011'), true);
  for (const value of [null, undefined, 123, {}, [], '', '507f1f77bcf86cd79943901', '507f1f77bcf86cd7994390110', 'zz7f1f77bcf86cd799439011', 'abcdefghijkl', ' 507f1f77bcf86cd799439011']) {
    assert.equal(isObjectId(value), false);
  }
});

test('length validation uses inclusive caller-provided limits without trimming input', () => {
  assert.equal(hasLength('abc', { min: 3, max: 3 }), true);
  assert.equal(hasLength('ab', { min: 3 }), false);
  assert.equal(hasLength('abcd', { max: 3 }), false);
  assert.equal(hasLength('', { min: 0, max: 0 }), true);
  assert.equal(hasLength([1, 2], { min: 1, max: 2 }), true);
  assert.equal(hasLength('  ', { min: 2 }), true);
  assert.equal(hasLength(null), false);
  assert.equal(hasLength({ length: 3 }), false);
  for (const limits of [{ min: -1 }, { min: 3, max: 2 }, { max: -1 }, { min: 1.5 }, { max: NaN }]) {
    assert.throws(() => hasLength('abc', limits), RangeError);
  }
});

test('required field validation produces safe field/message details', () => {
  assert.deepEqual(validateRequiredFields({ email: ' ' }, ['name', 'email']), [
    { field: 'name', message: 'This field is required.' },
    { field: 'email', message: 'This field is required.' },
  ]);
  assert.deepEqual(validateRequiredFields({ count: 0, enabled: false }, ['count', 'enabled']), []);
  assert.deepEqual(validateRequiredFields({}, ['toString']), [
    { field: 'toString', message: 'This field is required.' },
  ]);
  for (const body of [undefined, null, [], 1, 'text']) {
    assert.deepEqual(validateRequiredFields(body, ['email']), [
      { field: 'body', message: 'Request body must be an object.' },
    ]);
  }
});

test('AppError carries controlled error metadata and rejects non-error HTTP statuses', () => {
  const details = [{ field: 'email', message: 'Invalid email address.' }];
  const error = new AppError('Invalid request data.', 400, 'VALIDATION_ERROR', details);
  assert.ok(error instanceof Error);
  assert.equal(error.name, 'AppError');
  assert.equal(error.statusCode, 400);
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.message, 'Invalid request data.');
  assert.deepEqual(error.details, details);
  for (const status of [200, 302, 399, 600, '400', NaN, 400.5]) {
    assert.throws(() => new AppError('Invalid status.', status), TypeError);
  }
});
