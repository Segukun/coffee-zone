import AppError from '../utils/AppError.js';
import { authenticateToken } from '../services/authService.js';

export default async function authMiddleware(request, response, next) {
  const authorization = request.get('Authorization');
  const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) throw new AppError('Authentication required.', 401, 'UNAUTHORIZED');

  request.user = await authenticateToken(match[1]);
  next();
}
