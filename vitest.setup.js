import { existsSync } from 'node:fs';
import { beforeAll, afterAll } from 'vitest';

// vitest's own script doesn't pass Node's --env-file flag, so read it here.
// In CI, MONGODB_URI is set directly as a workflow env var instead.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

// mongoose isn't installed until issue 05 (npm install mongoose) — before
// that, this setup file must stay a no-op instead of crashing npm test.
let mongoose;
try {
  ({ default: mongoose } = await import('mongoose'));
} catch {
  // not installed yet
}

// src/logger.js isn't created until issue 04c — before that, this setup
// file must stay a no-op instead of crashing npm test.
try {
  const { default: logger } = await import('./src/logger.js');
  logger.level = 'silent';
} catch {
  // not created yet
}

beforeAll(async () => {
  if (mongoose) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  if (mongoose) {
    await mongoose.disconnect();
  }
});
