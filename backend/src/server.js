import dns from 'node:dns';
import { assertEnv, env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

// Many home and mobile networks have a broken IPv6 route, which makes outgoing requests (such as the weather
// providers) hang until they time out. Preferring IPv4 addresses avoids that and is harmless elsewhere.
dns.setDefaultResultOrder('ipv4first');

try {
  assertEnv();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

try {
  await connectDB();
} catch (err) {
  console.error(`Database connection failed: ${err.message}`);
  process.exit(1);
}

const server = createApp().listen(env.port, () => {
  console.log(`AgriLink API listening on :${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err));
