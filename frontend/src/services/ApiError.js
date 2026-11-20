export class ApiError extends Error {
  constructor(message, { status = null, code, details, retryAfter = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (details?.length) this.details = details;
    this.retryAfter = retryAfter;
  }
}
