import bcrypt from "bcryptjs";

const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, saltRounds);

export const comparePassword = async (password: string, passwordHash: string) =>
  bcrypt.compare(password, passwordHash);
