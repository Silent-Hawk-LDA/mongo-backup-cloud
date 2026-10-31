import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { MongoToolError } from "../errors/index.js";
import { execFileSafe } from "../utils/exec.js";
import { gzipFile } from "../compression/gzip.js";
import { encryptFile } from "../encryption/aes.js";
import { sha256File } from "../utils/checksum.js";
import { archiveFileName } from "../utils/paths.js";
import type { MongoConnectionConfig } from "../config/types.js";

export interface BackupEngineOptions {
  mongodb: MongoConnectionConfig;
  tempDir: string;
  compressionLevel?: number;
  encryption?: { enabled: boolean; key?: string };
}

export interface BackupArtifact {
  backupId: string;
  filePath: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  checksum: string;
  encrypted: boolean;
}

/**
 * Wraps the official `mongodump` binary. Uses `--archive` + `--gzip` so the
 * dump streams directly to a single compressed file instead of buffering
 * the whole database in memory, and never builds a shell command string
 * from configuration values (arguments are always passed as an array).
 */
export class BackupEngine {
  private readonly options: BackupEngineOptions;

  constructor(options: BackupEngineOptions) {
    this.options = options;
  }

  async dump(backupId: string): Promise<BackupArtifact> {
    await mkdir(this.options.tempDir, { recursive: true });

    const rawArchivePath = join(this.options.tempDir, `${backupId}.raw.archive`);
    const args = [
      `--uri=${this.options.mongodb.uri}`,
      `--db=${this.options.mongodb.database}`,
      `--archive=${rawArchivePath}`
    ];

    for (const collection of this.options.mongodb.collections ?? []) {
      args.push(`--collection=${collection}`);
    }

    const result = await execFileSafe("mongodump", args, {
      timeoutMs: this.options.mongodb.timeoutMs ?? 30 * 60 * 1000
    });

    if (result.code !== 0) {
      throw new MongoToolError(`mongodump exited with code ${result.code}: ${result.stderr}`);
    }

    const originalStats = await stat(rawArchivePath);

    const compressedPath = join(this.options.tempDir, archiveFileName(backupId));
    await gzipFile(rawArchivePath, compressedPath, this.options.compressionLevel);
    await rm(rawArchivePath, { force: true });

    let finalPath = compressedPath;
    let encrypted = false;

    if (this.options.encryption?.enabled) {
      const key = this.options.encryption.key ?? process.env.BACKUP_ENCRYPTION_KEY;
      if (!key) {
        throw new MongoToolError("Encryption is enabled but no encryption key is available.");
      }
      const encryptedPath = `${compressedPath}.enc`;
      await encryptFile(compressedPath, encryptedPath, key);
      await rm(compressedPath, { force: true });
      finalPath = encryptedPath;
      encrypted = true;
    }

    const compressedStats = await stat(finalPath);
    const checksum = await sha256File(finalPath);

    return {
      backupId,
      filePath: finalPath,
      originalSizeBytes: originalStats.size,
      compressedSizeBytes: compressedStats.size,
      checksum,
      encrypted
    };
  }
}
