import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export type PasswordHash = {
  algorithm: "pbkdf2-sha256";
  iterations: number;
  salt: string;
  hash: string;
};

const defaultIterations = 210_000;

export function hashPassword(input: {
  password: string;
  iterations?: number;
  unsafeAllowShortPassword?: boolean;
  salt?: Uint8Array;
}): PasswordHash {
  if (!input.unsafeAllowShortPassword && input.password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }

  const salt = input.salt ?? randomBytes(16);
  const iterations = input.iterations ?? defaultIterations;
  const hash = pbkdf2Sync(input.password, Buffer.from(salt), iterations, 32, "sha256");

  return {
    algorithm: "pbkdf2-sha256",
    iterations,
    salt: Buffer.from(salt).toString("base64url"),
    hash: hash.toString("base64url")
  };
}

export function verifyPassword(input: {
  password: string;
  stored: PasswordHash;
}): boolean {
  if (input.stored.algorithm !== "pbkdf2-sha256") {
    return false;
  }

  const candidate = pbkdf2Sync(
    input.password,
    Buffer.from(input.stored.salt, "base64url"),
    input.stored.iterations,
    32,
    "sha256"
  );
  const expected = Buffer.from(input.stored.hash, "base64url");

  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
