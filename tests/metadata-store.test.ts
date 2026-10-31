import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonMetadataStore } from "../src/metadata/json-metadata-store.js";
import type { BackupMetadata } from "../src/metadata/types.js";

function makeMetadata(overrides: Partial<BackupMetadata> = {}): BackupMetadata {
  return {
    backupId: "db-2026-01-01",
    database: "db",
    createdAt: new Date().toISOString(),
    originalSizeBytes: 100,
    compressedSizeBytes: 50,
    checksum: "abc",
    encrypted: false,
    durationMs: 10,
    status: "success",
    destinations: [],
    ...overrides
  };
}

describe("JsonMetadataStore", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    dirs.length = 0;
  });

  it("saves, lists, updates and deletes records, surviving concurrent writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-meta-"));
    dirs.push(dir);
    const store = new JsonMetadataStore(join(dir, "metadata.json"));

    await Promise.all([
      store.save(makeMetadata({ backupId: "a" })),
      store.save(makeMetadata({ backupId: "b" })),
      store.save(makeMetadata({ backupId: "c" }))
    ]);

    expect(await store.list()).toHaveLength(3);

    await store.update("a", { status: "failed" });
    expect((await store.get("a"))?.status).toBe("failed");

    await store.delete("b");
    expect(await store.list()).toHaveLength(2);
  });

  it("treats a missing file as an empty store", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mbc-meta-"));
    dirs.push(dir);
    const store = new JsonMetadataStore(join(dir, "nope", "metadata.json"));
    expect(await store.list()).toEqual([]);
  });
});
