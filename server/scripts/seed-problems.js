import 'dotenv/config';
import mongoose from 'mongoose';
import { seedProblems } from '../src/services/problemSeed.service.js';
try {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);
  for (const entry of await seedProblems()) console.log(`${entry.action}: ${entry.title}`);
} catch (error) { console.error('Problem seed failed:', error.name); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
