import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { BackupMetadata, MetadataStore } from "./types.js";

/**
 * Local JSON-file metadata store. Writes are done atomically (write to a
 * temp file, then rename) so an interrupted process never leaves the
 * metadata file corrupted or half-written.
 */
export class JsonMetadataStore implements MetadataStore {
  private readonly filePath: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async save(metadata: BackupMetadata): Promise<void> {
    await this.mutate((records) => {
      records.set(metadata.backupId, metadata);
    });
  }

  async update(backupId: string, patch: Partial<BackupMetadata>): Promise<void> {
    await this.mutate((records) => {
      const existing = records.get(backupId);
      if (!existing) {
        throw new Error(`Cannot update unknown backup metadata: ${backupId}`);
      }
      records.set(backupId, { ...existing, ...patch });
    });
  }

  async get(backupId: string): Promise<BackupMetadata | undefined> {
    const records = await this.readAll();
    return records.get(backupId);
  }

  async list(database?: string): Promise<BackupMetadata[]> {
    const records = Array.from((await this.readAll()).values());
    const filtered = database ? records.filter((r) => r.database === database) : records;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(backupId: string): Promise<void> {
    await this.mutate((records) => {
      records.delete(backupId);
    });
  }

  private async readAll(): Promise<Map<string, BackupMetadata>> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as BackupMetadata[];
      return new Map(parsed.map((record) => [record.backupId, record]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return new Map();
      }
      // Corrupted/incomplete metadata file from an interrupted write: treat
      // as empty rather than crashing the whole process.
      return new Map();
    }
  }

  private async mutate(fn: (records: Map<string, BackupMetadata>) => void): Promise<void> {
    const previous = this.writeLock;
    let release: () => void;
    this.writeLock = new Promise((resolve) => (release = resolve));
    await previous;
    try {
      const records = await this.readAll();
      fn(records);
      await this.persist(records);
    } finally {
      release!();
    }
  }

  private async persist(records: Map<string, BackupMetadata>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = join(dirname(this.filePath), `.${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.tmp`);
    const data = JSON.stringify(Array.from(records.values()), null, 2);
    await writeFile(tempPath, data, "utf8");
    await rename(tempPath, this.filePath);
  }
}
