import { STATUS_CODES } from 'node:http';
import AppError from '../utils/AppError.js';

function isErrorStatus(statusCode) {
  return Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599;
}

function isSafeField(field) {
  return typeof field === 'string' && field.length <= 100
    && /^[a-zA-Z_][a-zA-Z\d_]*(?:\.[a-zA-Z\d_]+)*$/.test(field);
}

function normalizeError(error) {
  if (error instanceof AppError) {
    // AppError messages and details are public, developer-authored text.
    const details = Array.isArray(error.details)
      ? error.details
        .filter((detail) => detail && isSafeField(detail.field) && typeof detail.message === 'string')
        .map(({ field, message }) => ({ field, message }))
      : undefined;

    return { statusCode: error.statusCode, code: error.code, message: error.message, details };
  }

  if (error?.type === 'entity.parse.failed' && error.status === 400) {
    return { statusCode: 400, code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' };
  }

  if (error?.name === 'ValidationError') {
    const details = Object.entries(error.errors || {})
      .filter(([field]) => isSafeField(field))
      .map(([field, fieldError]) => ({
        field,
        message: fieldError?.kind === 'required' ? 'This field is required.' : 'Invalid value.',
      }));

    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid request data.', details };
  }

  if (error?.name === 'CastError') {
    const details = isSafeField(error.path) ? [{ field: error.path, message: 'Invalid value.' }] : undefined;
    return { statusCode: 400, code: 'INVALID_VALUE', message: 'Invalid request data.', details };
  }

  if (error?.code === 11000) {
    // Only expose known public identifiers, never key values or index messages.
    const details = Object.keys(error.keyPattern || error.keyValue || {})
      .filter((field) => ['email', 'username', '_id'].includes(field))
      .map((field) => ({ field, message: 'This value is already in use.' }));

    return { statusCode: 409, code: 'DUPLICATE_KEY', message: 'A record with these details already exists.', details };
  }

  const statusCode = [error?.statusCode, error?.status].find(isErrorStatus) || 500;
  return { statusCode, code: 'HTTP_ERROR', message: STATUS_CODES[statusCode] || 'Request failed.' };
}

export default function errorMiddleware(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  const normalizedError = normalizeError(error);
  const statusCode = isErrorStatus(normalizedError.statusCode) ? normalizedError.statusCode : 500;

  if (statusCode >= 500) {
    // Never log request bodies, URLs, error messages, stacks, or database objects.
    console.error('Request failed with a server error.', { statusCode, method: request.method });
    return response.status(statusCode).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' },
    });
  }

  const payload = { code: normalizedError.code, message: normalizedError.message };
  if (normalizedError.details?.length) {
    payload.details = normalizedError.details;
  }

  return response.status(statusCode).json({ error: payload });
}
