import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const rootDir = new URL('..', import.meta.url);

async function ensureMongoUri() {
  if (process.env.MONGODB_URI) {
    console.log(`Using configured MongoDB: ${process.env.MONGODB_URI}`);
    return null;
  }

  const mongo = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: {
      dbName: 'neurotwin',
      port: 27017,
      launchTimeout: 120000,
    },
  });

  process.env.MONGODB_URI = mongo.getUri();
  console.log(`Using embedded MongoMemoryServer: ${process.env.MONGODB_URI}`);

  const shutdown = async () => {
    try {
      await mongo.stop();
    } catch (error) {
      console.warn('MongoMemoryServer shutdown warning:', error.message);
    }
  };

  process.on('SIGINT', () => {
    shutdown().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    shutdown().finally(() => process.exit(0));
  });

  return mongo;
}

const main = async () => {
  const mongo = await ensureMongoUri();

  const child = spawn(process.execPath, ['--watch', 'src/index.js'], {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', async (code, signal) => {
    if (mongo) {
      try {
        await mongo.stop();
      } catch (error) {
        console.warn('MongoMemoryServer cleanup warning:', error.message);
      }
    }
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
};

main().catch((error) => {
  console.error('Failed to start NeuroTwin dev server:', error);
  process.exit(1);
});
