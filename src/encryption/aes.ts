import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { EncryptionError } from "../errors/index.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function resolveKey(key: string): Buffer {
  const buffer = Buffer.from(key, "hex");
  if (buffer.length !== 32) {
    throw new EncryptionError(
      "Encryption key must be a 32-byte value encoded as a 64-character hex string."
    );
  }
  return buffer;
}

/**
 * Encrypts a file with AES-256-GCM. The output layout is
 * `[12-byte IV][ciphertext][16-byte auth tag]`. A fresh random IV is
 * generated per backup. The key itself is never written to the output file
 * or logged.
 */
export async function encryptFile(
  sourcePath: string,
  destinationPath: string,
  key: string
): Promise<void> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, resolveKey(key), iv);
  const output = createWriteStream(destinationPath);

  output.write(iv);
  await pipeline(createReadStream(sourcePath), cipher, output, { end: false });
  output.end(cipher.getAuthTag());
  await new Promise<void>((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });
}

export async function decryptFile(
  sourcePath: string,
  destinationPath: string,
  key: string
): Promise<void> {
  const { readFile } = await import("node:fs/promises");
  const fullBuffer = await readFile(sourcePath);

  if (fullBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new EncryptionError("Encrypted backup file is truncated or corrupted.");
  }

  const iv = fullBuffer.subarray(0, IV_LENGTH);
  const authTag = fullBuffer.subarray(fullBuffer.length - AUTH_TAG_LENGTH);
  const ciphertext = fullBuffer.subarray(IV_LENGTH, fullBuffer.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, resolveKey(key), iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(destinationPath, plaintext);
  } catch {
    throw new EncryptionError(
      "Failed to decrypt backup: authentication tag verification failed. The file may be corrupted or the key is incorrect."
    );
  }
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
