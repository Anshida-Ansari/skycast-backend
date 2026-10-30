import { Response } from 'express';

export interface ApiResponseMeta {
  timestamp: string;
  cached?: boolean;
  cacheExpiresAt?: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiResponseMeta;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  metaExtras: Partial<ApiResponseMeta> = {}
): void => {
  const meta: ApiResponseMeta = {
    timestamp: new Date().toISOString(),
    ...metaExtras,
  };

  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta,
  };

  res.status(statusCode).json(payload);
};

