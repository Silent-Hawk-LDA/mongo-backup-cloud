import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encryptFile, decryptFile, generateEncryptionKey } from "../src/encryption/aes.js";
import { EncryptionError } from "../src/errors/index.js";

describe("AES-256-GCM encryption", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it("round-trips file contents with the correct key", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-aes-"));
    dirs.push(dir);

    const key = generateEncryptionKey();
    const original = Buffer.from("sensitive mongodb dump data");
    const sourcePath = join(dir, "source.bin");
    const encryptedPath = join(dir, "source.enc");
    const decryptedPath = join(dir, "decrypted.bin");

    await writeFile(sourcePath, original);
    await encryptFile(sourcePath, encryptedPath, key);
    await decryptFile(encryptedPath, decryptedPath, key);

    const decrypted = await readFile(decryptedPath);
    expect(decrypted.equals(original)).toBe(true);
  });

  it("fails to decrypt with the wrong key", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-aes-"));
    dirs.push(dir);

    const sourcePath = join(dir, "source.bin");
    const encryptedPath = join(dir, "source.enc");
    const decryptedPath = join(dir, "decrypted.bin");

    await writeFile(sourcePath, Buffer.from("data"));
    await encryptFile(sourcePath, encryptedPath, generateEncryptionKey());

    await expect(decryptFile(encryptedPath, decryptedPath, generateEncryptionKey())).rejects.toThrow(
      EncryptionError
    );
  });
});
