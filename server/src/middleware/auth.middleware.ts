import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../lib/auth.js";
import type { AuthenticatedRequest } from "../types/index.js";
import { UnauthorizedError } from "../utils/errors.js";
import { toHeadersInit } from "../utils/helpers.js";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: toHeadersInit(req.headers),
    });

    if (!session) {
      throw new UnauthorizedError();
    }

    const authenticatedRequest = req as AuthenticatedRequest;

    authenticatedRequest.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ?? undefined,
    };
    authenticatedRequest.requestId = uuidv4();

    const userGeminiKey = req.headers["x-gemini-api-key"];
    if (typeof userGeminiKey === "string" && userGeminiKey.length > 0) {
      authenticatedRequest.geminiApiKey = userGeminiKey;
    }

    next();
  } catch (error) {
    next(error);
  }
}
