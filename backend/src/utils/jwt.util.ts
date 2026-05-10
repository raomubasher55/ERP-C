import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

export type AuthPayload = {
  sub: string;
  email: string;
  name: string;
  role: "admin" | "clinic_owner" | "doctor" | "receptionist" | "patient" | "clinic";
};

export const signToken = (payload: AuthPayload) =>
  jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn } as SignOptions);

export const verifyToken = (token: string) =>
  jwt.verify(token, jwtSecret) as JwtPayload & AuthPayload;
