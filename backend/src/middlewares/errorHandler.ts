import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: number | string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Map Multer file size limit to 413 Payload Too Large
  if (err.code === 'LIMIT_FILE_SIZE' || (err as any).name === 'MulterError') {
    statusCode = 413;
    message = 'File exceeds maximum 5MB size limit';
  }

  // Map Mongo duplicate key error 11000 to 409 Conflict
  if (err.code === 11000) {
    statusCode = 409;
    message = 'A document with this name already exists';
  }

  console.error(`[Error] ${req.method} ${req.url} - ${statusCode}: ${message}`);
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
