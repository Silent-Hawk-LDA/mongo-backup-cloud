import { createReadStream, createWriteStream } from "node:fs";
import { StorageProviderError } from "../../errors/index.js";
import type { RemoteFileInfo, StorageProvider } from "../interfaces/storage-provider.js";

export interface GoogleDriveProviderOptions {
  credentials: string | Record<string, unknown>;
  folderId: string;
}

/**
 * Google Drive provider authenticated via a Service Account. Supports
 * resumable uploads (handled internally by `googleapis`' media upload for
 * large files), listing, downloading, deleting and metadata retrieval.
 *
 * `googleapis` is an optional dependency, imported lazily.
 */
export class GoogleDriveProvider implements StorageProvider {
  readonly name = "google-drive";
  private readonly options: GoogleDriveProviderOptions;
  private drivePromise: Promise<import("googleapis").drive_v3.Drive> | undefined;

  constructor(options: GoogleDriveProviderOptions) {
    this.options = options;
  }

  private async getDrive() {
    if (!this.drivePromise) {
      this.drivePromise = (async () => {
        let google: typeof import("googleapis").google;
        try {
          ({ google } = await import("googleapis"));
        } catch {
          throw new StorageProviderError(
            'The "google-drive" provider requires the optional dependency "googleapis". Install it with: npm install googleapis',
            "google-drive"
          );
        }

        const credentials =
          typeof this.options.credentials === "string"
            ? JSON.parse(await (await import("node:fs/promises")).readFile(this.options.credentials, "utf8"))
            : this.options.credentials;

        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ["https://www.googleapis.com/auth/drive"]
        });

        return google.drive({ version: "v3", auth });
      })();
    }
    return this.drivePromise;
  }

  async upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo> {
    try {
      const drive = await this.getDrive();
      const response = await drive.files.create({
        requestBody: { name: remoteFileName, parents: [this.options.folderId] },
        media: { body: createReadStream(localFilePath) },
        fields: "id, name, size, createdTime"
      });
      return {
        id: response.data.id ?? "",
        name: response.data.name ?? remoteFileName,
        sizeBytes: Number(response.data.size ?? 0),
        createdAt: response.data.createdTime ?? new Date().toISOString()
      };
    } catch (error) {
      throw this.wrap("upload", error);
    }
  }

  async download(remoteFileId: string, destinationPath: string): Promise<void> {
    try {
      const drive = await this.getDrive();
      const response = await drive.files.get(
        { fileId: remoteFileId, alt: "media" },
        { responseType: "stream" }
      );
      await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(destinationPath);
        (response.data as NodeJS.ReadableStream).pipe(output).on("finish", resolve).on("error", reject);
      });
    } catch (error) {
      throw this.wrap("download", error);
    }
  }

  async list(): Promise<RemoteFileInfo[]> {
    try {
      const drive = await this.getDrive();
      const response = await drive.files.list({
        q: `'${this.options.folderId}' in parents and trashed = false`,
        fields: "files(id, name, size, createdTime)"
      });
      return (response.data.files ?? []).map((file) => ({
        id: file.id ?? "",
        name: file.name ?? "",
        sizeBytes: Number(file.size ?? 0),
        createdAt: file.createdTime ?? new Date().toISOString()
      }));
    } catch (error) {
      throw this.wrap("list", error);
    }
  }

  async delete(remoteFileId: string): Promise<void> {
    try {
      const drive = await this.getDrive();
      await drive.files.delete({ fileId: remoteFileId });
    } catch (error) {
      throw this.wrap("delete", error);
    }
  }

  async getMetadata(remoteFileId: string): Promise<RemoteFileInfo> {
    try {
      const drive = await this.getDrive();
      const response = await drive.files.get({
        fileId: remoteFileId,
        fields: "id, name, size, createdTime"
      });
      return {
        id: response.data.id ?? remoteFileId,
        name: response.data.name ?? "",
        sizeBytes: Number(response.data.size ?? 0),
        createdAt: response.data.createdTime ?? new Date().toISOString()
      };
    } catch (error) {
      throw this.wrap("getMetadata", error);
    }
  }

  private wrap(operation: string, error: unknown): StorageProviderError {
    if (error instanceof StorageProviderError) return error;
    return new StorageProviderError(
      `google-drive ${operation} failed: ${(error as Error).message}`,
      "google-drive"
    );
  }
}
