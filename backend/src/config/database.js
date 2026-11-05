import mongoose from 'mongoose';

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    const error = new Error('MONGODB_URI is not defined');
    error.code = 'MONGODB_URI_MISSING';
    throw error;
  }

  await mongoose.connect(mongoUri);

  console.log('MongoDB connected');
};

export default connectDatabase;
