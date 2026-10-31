import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalStorageProvider } from "../src/providers/local/local-provider.js";

describe("LocalStorageProvider", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it("uploads, lists, downloads and deletes files", async () => {
    const sourceDir = await mkdtemp(join(tmpdir(), "mbc-src-"));
    const storeDir = await mkdtemp(join(tmpdir(), "mbc-store-"));
    dirs.push(sourceDir, storeDir);

    const provider = new LocalStorageProvider({ path: storeDir });
    const sourceFile = join(sourceDir, "backup.gz");
    await writeFile(sourceFile, "backup-contents");

    const uploaded = await provider.upload(sourceFile, "backup.gz");
    expect(uploaded.name).toBe("backup.gz");

    const listed = await provider.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.name).toBe("backup.gz");

    const downloadPath = join(sourceDir, "downloaded.gz");
    await provider.download(uploaded.id, downloadPath);

    await provider.delete(uploaded.id);
    expect(await provider.list()).toHaveLength(0);
  });
});
