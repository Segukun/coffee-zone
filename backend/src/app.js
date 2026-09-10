import express from 'express';
import cors from 'cors';

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

export default app;