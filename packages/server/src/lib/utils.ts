/**
 * Hash a password using Bun's built-in password hashing (bcrypt).
 */
export async function hash(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

/**
 * Verify a password against a hash.
 */
export async function verify(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return Bun.password.verify(password, hashedPassword);
}
