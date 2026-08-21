import type { ErrorRequestHandler, RequestHandler } from "express";
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new AppError(404, "NOT_FOUND", "Resource not found"));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const known = error instanceof AppError;
  const status = known ? error.status : 500;
  res.status(status).json({
    success: false,
    error: {
      code: known ? error.code : "INTERNAL_ERROR",
      message: known ? error.message : "An unexpected error occurred",
      ...(known && error.details ? { details: error.details } : {}),
    },
  });
};
