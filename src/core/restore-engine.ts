import { mkdir, rm, access } from "node:fs/promises";
import { join } from "node:path";
import {
  ChecksumMismatchError,
  MongoToolError,
  RestoreConfirmationRequiredError
} from "../errors/index.js";
import { execFileSafe } from "../utils/exec.js";
import { gunzipFile } from "../compression/gzip.js";
import { decryptFile } from "../encryption/aes.js";
import { sha256File } from "../utils/checksum.js";
import type { MongoConnectionConfig } from "../config/types.js";
import type { StorageProvider } from "../providers/interfaces/storage-provider.js";
import type { BackupMetadata } from "../metadata/types.js";

export interface RestoreOptions {
  backupId: string;
  confirm: boolean;
  targetDatabase?: string;
  targetUri?: string;
  collections?: string[];
  namespaceMapping?: Record<string, string>;
}

export interface RestoreEngineOptions {
  mongodb: MongoConnectionConfig;
  tempDir: string;
  encryption?: { enabled: boolean; key?: string };
}

/**
 * Wraps the official `mongorestore` binary. Destructive by nature, so every
 * restore requires explicit `confirm: true` and verifies the backup's
 * checksum before touching any database.
 */
export class RestoreEngine {
  private readonly options: RestoreEngineOptions;

  constructor(options: RestoreEngineOptions) {
    this.options = options;
  }

  async restore(
    metadata: BackupMetadata,
    provider: StorageProvider,
    remoteFileId: string,
    options: RestoreOptions
  ): Promise<void> {
    if (!options.confirm) {
      throw new RestoreConfirmationRequiredError();
    }

    await mkdir(this.options.tempDir, { recursive: true });
    const downloadedPath = join(this.options.tempDir, `${metadata.backupId}.download`);

    try {
      await provider.download(remoteFileId, downloadedPath);

      const checksum = await sha256File(downloadedPath);
      if (checksum !== metadata.checksum) {
        throw new ChecksumMismatchError(
          `Checksum mismatch for backup ${metadata.backupId}: expected ${metadata.checksum}, got ${checksum}.`
        );
      }

      let compressedPath = downloadedPath;
      if (metadata.encrypted) {
        const key = this.options.encryption?.key ?? process.env.BACKUP_ENCRYPTION_KEY;
        if (!key) {
          throw new MongoToolError("Backup is encrypted but no decryption key is available.");
        }
        compressedPath = `${downloadedPath}.decrypted`;
        await decryptFile(downloadedPath, compressedPath, key);
      }

      const archivePath = join(this.options.tempDir, `${metadata.backupId}.restore.archive`);
      await gunzipFile(compressedPath, archivePath);

      const args = [
        `--uri=${options.targetUri ?? this.options.mongodb.uri}`,
        `--archive=${archivePath}`,
        `--nsFrom=${metadata.database}.*`,
        `--nsTo=${(options.targetDatabase ?? metadata.database)}.*`
      ];

      for (const collection of options.collections ?? []) {
        args.push(`--nsInclude=${metadata.database}.${collection}`);
      }

      for (const [from, to] of Object.entries(options.namespaceMapping ?? {})) {
        args.push(`--nsFrom=${from}`, `--nsTo=${to}`);
      }

      const result = await execFileSafe("mongorestore", args, {
        timeoutMs: this.options.mongodb.timeoutMs ?? 30 * 60 * 1000
      });

      if (result.code !== 0) {
        throw new MongoToolError(`mongorestore exited with code ${result.code}: ${result.stderr}`);
      }
    } finally {
      await this.cleanup([
        downloadedPath,
        `${downloadedPath}.decrypted`,
        join(this.options.tempDir, `${metadata.backupId}.restore.archive`)
      ]);
    }
  }

  private async cleanup(paths: string[]): Promise<void> {
    for (const path of paths) {
      try {
        await access(path);
        await rm(path, { force: true });
      } catch {
        // Not present; nothing to clean up.
      }
    }
  }
}
