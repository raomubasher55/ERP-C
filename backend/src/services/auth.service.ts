import { createUser, getUserByEmail } from "./user.service";
import { comparePassword, hashPassword } from "../utils/password.util";
import { signToken } from "../utils/jwt.util";

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
}) => {
  const existing = await getUserByEmail(input.email);
  if (existing) {
    const error = new Error("Email already in use");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash,
    role: "patient",
  });

  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "patient",
  });

  return { user, token };
};

export const loginUser = async (input: { email: string; password: string }) => {
  const user = await getUserByEmail(input.email);
  if (!user) {
    const error = new Error("Invalid email or password");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const matches = await comparePassword(input.password, user.passwordHash as string);
  if (!matches) {
    const error = new Error("Invalid email or password");
    (error as Error & { status?: number }).status = 401;
    throw error;
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? "patient",
  });

  return { user, token };
};
