import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonMetadataStore } from "../src/metadata/json-metadata-store.js";
import { RetentionManager } from "../src/retention/retention-manager.js";
import { LocalStorageProvider } from "../src/providers/local/local-provider.js";
import type { BackupMetadata } from "../src/metadata/types.js";

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("RetentionManager", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it("deletes expired backups but always protects the latest successful one", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-retention-"));
    dirs.push(dir);

    const store = new JsonMetadataStore(join(dir, "metadata.json"));
    const provider = new LocalStorageProvider({ path: join(dir, "store") });

    const makeRecord = (id: string, ageDays: number): BackupMetadata => ({
      backupId: id,
      database: "db",
      createdAt: daysAgo(ageDays),
      originalSizeBytes: 1,
      compressedSizeBytes: 1,
      checksum: "x",
      encrypted: false,
      durationMs: 1,
      status: "success",
      destinations: [
        { provider: "local", required: true, status: "success", remoteFileId: join(dir, "store", `${id}.gz`), attempts: 1 }
      ]
    });

    await mkdir(join(dir, "store"), { recursive: true });
    for (const id of ["old-1", "old-2", "latest"]) {
      await writeFile(join(dir, "store", `${id}.gz`), "data");
    }

    await store.save(makeRecord("old-1", 100));
    await store.save(makeRecord("old-2", 60));
    await store.save(makeRecord("latest", 1));

    const manager = new RetentionManager(store);
    const deleted = await manager.cleanup("db", { provider, retention: { days: 30 } });

    expect(deleted.sort()).toEqual(["old-1", "old-2"]);
    expect(await store.get("latest")).toBeDefined();
    expect(await store.get("old-1")).toBeUndefined();
  });

  it("does nothing when retention is unlimited", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-retention-"));
    dirs.push(dir);
    const store = new JsonMetadataStore(join(dir, "metadata.json"));
    const provider = new LocalStorageProvider({ path: join(dir, "store") });

    const manager = new RetentionManager(store);
    const deleted = await manager.cleanup("db", { provider, retention: { days: "unlimited" } });
    expect(deleted).toEqual([]);
  });
});
