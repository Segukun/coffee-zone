export default class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', details) {
    super(message);

    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      throw new TypeError('AppError requires an HTTP error status between 400 and 599.');
    }

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
