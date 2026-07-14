import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, ValidationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, "NOT_FOUND"));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  let handledError: AppError;

  if (error instanceof ZodError) {
    handledError = new ValidationError("Validation failed", error.flatten().fieldErrors);
  } else if (error instanceof AppError) {
    handledError = error;
  } else if (error instanceof Error) {
    handledError = new AppError(error.message);
  } else {
    handledError = new AppError("Internal Server Error");
  }

  logger.error(
    `${req.method} ${req.originalUrl} failed`,
    handledError,
    {
      code: handledError.code,
      statusCode: handledError.statusCode,
    },
  );

  res.status(handledError.statusCode).json({
    success: false,
    error: {
      code: handledError.code,
      message: handledError.message,
      ...(handledError instanceof ValidationError ? { errors: handledError.errors } : {}),
    },
  });
}
