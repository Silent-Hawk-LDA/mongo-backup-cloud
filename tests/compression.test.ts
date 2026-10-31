import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipFile, gunzipFile } from "../src/compression/gzip.js";

describe("gzip compression", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it("round-trips file contents", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-gzip-"));
    dirs.push(dir);

    const original = Buffer.from("hello mongodb backup".repeat(1000));
    const sourcePath = join(dir, "source.bin");
    const gzippedPath = join(dir, "source.bin.gz");
    const restoredPath = join(dir, "restored.bin");

    await writeFile(sourcePath, original);
    await gzipFile(sourcePath, gzippedPath);
    await gunzipFile(gzippedPath, restoredPath);

    const restored = await readFile(restoredPath);
    expect(restored.equals(original)).toBe(true);
  });
});
