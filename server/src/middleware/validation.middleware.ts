import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

type ValidationTarget = "body" | "query" | "params";

export function validate<T>(
  schema: ZodTypeAny,
  target: ValidationTarget = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      // In Express 5, req.query and req.params are read-only getters.
      // Only assign back for req.body which is writable.
      if (target === "body") {
        req.body = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
