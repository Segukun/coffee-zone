import express from 'express';
import helmet from 'helmet';
import { getSecurityConfig } from './config/security.js';
import { createAuthLimiter, createCors, requireJsonBody } from './middlewares/securityMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notFoundMiddleware from './middlewares/notFoundMiddleware.js';
import errorMiddleware from './middlewares/errorMiddleware.js';

export function createApp(config = getSecurityConfig()) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(createCors(config));
  // Count all authentication attempts, including malformed JSON and invalid content types.
  app.post('/api/auth/login', createAuthLimiter(config, config.loginMax, 'login'));
  app.post('/api/auth/register', createAuthLimiter(config, config.registerMax, 'register'));
  app.use('/api', requireJsonBody);
  app.use(express.json({ limit: config.jsonLimitBytes }));

  app.get('/api/health', (request, response) => {
    response.status(200).json({
      data: {
        status: 'ok',
        message: 'Coffee Zone API is running',
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

export default createApp();
