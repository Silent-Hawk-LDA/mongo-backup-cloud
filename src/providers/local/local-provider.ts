import { mkdir, readdir, stat, unlink, copyFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { StorageProviderError } from "../../errors/index.js";
import type { RemoteFileInfo, StorageProvider } from "../interfaces/storage-provider.js";

export interface LocalProviderOptions {
  path: string;
}

/**
 * Reference storage provider. Stores backups in a local directory. Remote
 * file "ids" are just the absolute path within the configured directory.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly directory: string;

  constructor(options: LocalProviderOptions) {
    this.directory = options.path;
  }

  async upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo> {
    try {
      await mkdir(this.directory, { recursive: true });
      const destination = join(this.directory, remoteFileName);
      await copyFile(localFilePath, destination);
      const stats = await stat(destination);
      return {
        id: destination,
        name: remoteFileName,
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString()
      };
    } catch (error) {
      throw new StorageProviderError(`Local upload failed: ${(error as Error).message}`, "local");
    }
  }

  async download(remoteFileId: string, destinationPath: string): Promise<void> {
    try {
      await copyFile(remoteFileId, destinationPath);
    } catch (error) {
      throw new StorageProviderError(
        `Local download failed: ${(error as Error).message}`,
        "local"
      );
    }
  }

  async list(): Promise<RemoteFileInfo[]> {
    try {
      await mkdir(this.directory, { recursive: true });
      const entries = await readdir(this.directory);
      const infos: RemoteFileInfo[] = [];
      for (const entry of entries) {
        const fullPath = join(this.directory, entry);
        const stats = await stat(fullPath);
        if (stats.isFile()) {
          infos.push({
            id: fullPath,
            name: entry,
            sizeBytes: stats.size,
            createdAt: stats.mtime.toISOString()
          });
        }
      }
      return infos;
    } catch (error) {
      throw new StorageProviderError(`Local list failed: ${(error as Error).message}`, "local");
    }
  }

  async delete(remoteFileId: string): Promise<void> {
    try {
      await unlink(remoteFileId);
    } catch (error) {
      throw new StorageProviderError(`Local delete failed: ${(error as Error).message}`, "local");
    }
  }

  async getMetadata(remoteFileId: string): Promise<RemoteFileInfo> {
    try {
      const stats = await stat(remoteFileId);
      return {
        id: remoteFileId,
        name: basename(remoteFileId),
        sizeBytes: stats.size,
        createdAt: stats.mtime.toISOString()
      };
    } catch (error) {
      throw new StorageProviderError(
        `Local metadata lookup failed: ${(error as Error).message}`,
        "local"
      );
    }
  }
}
