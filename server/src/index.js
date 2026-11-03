import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { seed } from './seed.js';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'development-only-secret' || process.env.JWT_SECRET === 'change-this-secret' || process.env.JWT_SECRET.length < 32) {
    console.error('FATAL: A strong, unique JWT_SECRET (at least 32 characters) must be configured in production.');
    process.exit(1);
  }
}

const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neurotwin')
  .then(async () => {
    await seed();
    app.listen(port, () => console.log(`NeuroTwin API listening on port ${port}`));
  })
  .catch((e) => {
    console.error('MongoDB connection failed:', e.message);
    process.exit(1);
  });
