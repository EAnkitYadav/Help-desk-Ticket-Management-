import { hashPassword, verifyPassword } from "better-auth/crypto";

/**
 * Hash a password using Better Auth's password hashing.
 */
export async function hash(password: string): Promise<string> {
  return hashPassword(password);
}

/**
 * Verify a password against a hash.
 */
export async function verify(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return verifyPassword({ hash: hashedPassword, password });
}
