import AppError from '../utils/AppError.js';

export default function notFoundMiddleware(request, response, next) {
  next(new AppError('Endpoint not found.', 404, 'NOT_FOUND'));
}
