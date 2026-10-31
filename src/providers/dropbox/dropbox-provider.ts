import { createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { StorageProviderError } from "../../errors/index.js";
import type { RemoteFileInfo, StorageProvider } from "../interfaces/storage-provider.js";

export interface DropboxProviderOptions {
  accessToken: string;
  folder: string;
}

/**
 * Dropbox provider authenticated via an access token. `dropbox` is an
 * optional dependency, imported lazily so it's never required for users who
 * don't use this provider.
 */
export class DropboxProvider implements StorageProvider {
  readonly name = "dropbox";
  private readonly options: DropboxProviderOptions;
  private clientPromise: Promise<import("dropbox").Dropbox> | undefined;

  constructor(options: DropboxProviderOptions) {
    this.options = options;
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        let Dropbox: typeof import("dropbox").Dropbox;
        try {
          ({ Dropbox } = await import("dropbox"));
        } catch {
          throw new StorageProviderError(
            'The "dropbox" provider requires the optional dependency "dropbox". Install it with: npm install dropbox',
            "dropbox"
          );
        }
        return new Dropbox({ accessToken: this.options.accessToken });
      })();
    }
    return this.clientPromise;
  }

  private remotePath(remoteFileName: string): string {
    return `${this.options.folder.replace(/\/$/, "")}/${remoteFileName}`;
  }

  async upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo> {
    try {
      const client = await this.getClient();
      const contents = await readFile(localFilePath);
      const response = await client.filesUpload({
        path: this.remotePath(remoteFileName),
        contents,
        mode: { ".tag": "overwrite" }
      });
      return {
        id: response.result.path_lower ?? this.remotePath(remoteFileName),
        name: response.result.name,
        sizeBytes: response.result.size,
        createdAt: response.result.server_modified
      };
    } catch (error) {
      throw this.wrap("upload", error);
    }
  }

  async download(remoteFileId: string, destinationPath: string): Promise<void> {
    try {
      const client = await this.getClient();
      const response = await client.filesDownload({ path: remoteFileId });
      const fileBinary = (response.result as unknown as { fileBinary: Buffer }).fileBinary;
      await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(destinationPath);
        output.write(fileBinary, (error) => (error ? reject(error) : resolve()));
      });
    } catch (error) {
      throw this.wrap("download", error);
    }
  }

  async list(): Promise<RemoteFileInfo[]> {
    try {
      const client = await this.getClient();
      const response = await client.filesListFolder({ path: this.options.folder });
      return response.result.entries
        .filter((entry) => entry[".tag"] === "file")
        .map((entry) => {
          const file = entry as { path_lower?: string; name: string; size?: number; server_modified?: string };
          return {
            id: file.path_lower ?? file.name,
            name: file.name,
            sizeBytes: file.size ?? 0,
            createdAt: file.server_modified ?? new Date().toISOString()
          };
        });
    } catch (error) {
      throw this.wrap("list", error);
    }
  }

  async delete(remoteFileId: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.filesDeleteV2({ path: remoteFileId });
    } catch (error) {
      throw this.wrap("delete", error);
    }
  }

  async getMetadata(remoteFileId: string): Promise<RemoteFileInfo> {
    try {
      const client = await this.getClient();
      const response = await client.filesGetMetadata({ path: remoteFileId });
      const file = response.result as { path_lower?: string; name: string; size?: number; server_modified?: string };
      return {
        id: file.path_lower ?? remoteFileId,
        name: file.name,
        sizeBytes: file.size ?? 0,
        createdAt: file.server_modified ?? new Date().toISOString()
      };
    } catch (error) {
      throw this.wrap("getMetadata", error);
    }
  }

  private wrap(operation: string, error: unknown): StorageProviderError {
    if (error instanceof StorageProviderError) return error;
    return new StorageProviderError(`dropbox ${operation} failed: ${(error as Error).message}`, "dropbox");
  }
}
