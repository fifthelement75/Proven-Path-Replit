import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret) {
  throw new Error("JWT_SECRET environment variable must be set");
}
const JWT_SECRET: string = _rawSecret;

export interface AuthPayload {
  companyId: number;
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
