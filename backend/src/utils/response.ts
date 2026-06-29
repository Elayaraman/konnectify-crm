import type { Response } from "express";

import type { ApiErrorResponse, ApiSuccessResponse } from "../types";

export function success<T>(
  res: Response,
  data: T,
  statusCode = 200,
): Response<ApiSuccessResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function error(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown,
): Response<ApiErrorResponse> {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      message,
      ...(details === undefined ? {} : { details }),
    },
  };

  return res.status(statusCode).json(payload);
}
