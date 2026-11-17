import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import notFoundMiddleware from './middlewares/notFoundMiddleware.js';
import errorMiddleware from './middlewares/errorMiddleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (request, response) => {
  response.status(200).json({
    data: {
      status: 'ok',
      message: 'Coffee Zone API is running',
    },
  });
});

app.use('/api/auth', authRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
