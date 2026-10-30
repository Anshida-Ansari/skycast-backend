import mongoose from 'mongoose';
import { env } from './env.config.js';
import { logger } from '../utils/logger.js';

interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting' | 'unknown';
  readyState: number;
  host?: string;
  name?: string;
}

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error: %o', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Waiting for reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (error) {
    logger.error('Failed to establish initial MongoDB connection: %o', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully');
  } catch (error) {
    logger.error('Error during MongoDB disconnection: %o', error);
  }
};

export const getDatabaseHealth = (): DatabaseHealth => {
  const stateMap: Record<number, DatabaseHealth['status']> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  return {
    status: stateMap[readyState] || 'unknown',
    readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
};

