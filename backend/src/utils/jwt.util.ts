import jwt, { JwtPayload } from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

export type AuthPayload = {
  sub: string;
  email: string;
  name: string;
  role: "admin" | "clinic" | "patient";
};

export const signToken = (payload: AuthPayload) =>
  jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

export const verifyToken = (token: string) =>
  jwt.verify(token, jwtSecret) as JwtPayload & AuthPayload;
