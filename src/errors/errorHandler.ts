import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.config.js';
import { ApiErrorResponse } from '../utils/responseFormatter.js';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let code: string = ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected internal server error occurred';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else {
    logger.error('Unhandled Exception: %s', err.stack || err.message);
  }

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(env.NODE_ENV === 'development' && !(err instanceof AppError) ? { stack: err.stack } : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(statusCode).json(response);
};

