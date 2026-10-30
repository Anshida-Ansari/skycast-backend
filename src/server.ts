import { createApp } from './app.js';
import { env } from './config/env.config.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Start HTTP server (explicitly binding to 0.0.0.0 for Render and cloud container hosting)
    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 SkyCast Backend Server running in [${env.NODE_ENV}] mode on port ${env.PORT} (0.0.0.0)`);
      logger.info(`🌐 Health check available at: http://localhost:${env.PORT}/api/v1/health`);
    });

    // 4. Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        logger.info('SkyCast backend shutdown completed cleanly.');
        process.exit(0);
      });

      // Force exit after 10 seconds if connections hang
      setTimeout(() => {
        logger.error('Forced shutdown due to connection timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to initialize server: %o', error);
    process.exit(1);
  }
};

startServer();
