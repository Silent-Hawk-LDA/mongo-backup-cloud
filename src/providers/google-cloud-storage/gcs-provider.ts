import { createReadStream, createWriteStream } from "node:fs";
import { StorageProviderError } from "../../errors/index.js";
import type { RemoteFileInfo, StorageProvider } from "../interfaces/storage-provider.js";

export interface GoogleCloudStorageProviderOptions {
  bucket: string;
  credentials: string | Record<string, unknown>;
  prefix?: string;
  projectId?: string;
}

/**
 * Google Cloud Storage provider authenticated via a Service Account.
 * `@google-cloud/storage` is an optional dependency, imported lazily so it
 * is never required for consumers who don't use this provider.
 */
export class GoogleCloudStorageProvider implements StorageProvider {
  readonly name = "google-cloud-storage";
  private readonly options: GoogleCloudStorageProviderOptions;
  private bucketPromise: Promise<import("@google-cloud/storage").Bucket> | undefined;

  constructor(options: GoogleCloudStorageProviderOptions) {
    this.options = options;
  }

  private async getBucket() {
    if (!this.bucketPromise) {
      this.bucketPromise = (async () => {
        let Storage: typeof import("@google-cloud/storage").Storage;
        try {
          ({ Storage } = await import("@google-cloud/storage"));
        } catch {
          throw new StorageProviderError(
            'The "google-cloud-storage" provider requires the optional dependency "@google-cloud/storage". Install it with: npm install @google-cloud/storage',
            "google-cloud-storage"
          );
        }

        const credentials =
          typeof this.options.credentials === "string"
            ? JSON.parse(
                await (await import("node:fs/promises")).readFile(this.options.credentials, "utf8")
              )
            : this.options.credentials;

        const storage = new Storage({ credentials, projectId: this.options.projectId });
        return storage.bucket(this.options.bucket);
      })();
    }
    return this.bucketPromise;
  }

  private key(remoteFileName: string): string {
    return this.options.prefix ? `${this.options.prefix}/${remoteFileName}` : remoteFileName;
  }

  async upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo> {
    try {
      const bucket = await this.getBucket();
      const key = this.key(remoteFileName);
      const file = bucket.file(key);

      await new Promise<void>((resolve, reject) => {
        createReadStream(localFilePath)
          .pipe(file.createWriteStream({ resumable: true }))
          .on("finish", resolve)
          .on("error", reject);
      });

      return this.getMetadata(key);
    } catch (error) {
      throw this.wrap("upload", error);
    }
  }

  async download(remoteFileId: string, destinationPath: string): Promise<void> {
    try {
      const bucket = await this.getBucket();
      await new Promise<void>((resolve, reject) => {
        bucket
          .file(remoteFileId)
          .createReadStream()
          .pipe(createWriteStream(destinationPath))
          .on("finish", resolve)
          .on("error", reject);
      });
    } catch (error) {
      throw this.wrap("download", error);
    }
  }

  async list(): Promise<RemoteFileInfo[]> {
    try {
      const bucket = await this.getBucket();
      const [files] = await bucket.getFiles({ prefix: this.options.prefix });
      return files.map((file) => ({
        id: file.name,
        name: file.name.split("/").pop() ?? file.name,
        sizeBytes: Number(file.metadata.size ?? 0),
        createdAt: file.metadata.timeCreated ?? new Date().toISOString()
      }));
    } catch (error) {
      throw this.wrap("list", error);
    }
  }

  async delete(remoteFileId: string): Promise<void> {
    try {
      const bucket = await this.getBucket();
      await bucket.file(remoteFileId).delete();
    } catch (error) {
      throw this.wrap("delete", error);
    }
  }

  async getMetadata(remoteFileId: string): Promise<RemoteFileInfo> {
    try {
      const bucket = await this.getBucket();
      const [metadata] = await bucket.file(remoteFileId).getMetadata();
      return {
        id: remoteFileId,
        name: remoteFileId.split("/").pop() ?? remoteFileId,
        sizeBytes: Number(metadata.size ?? 0),
        createdAt: metadata.timeCreated ?? new Date().toISOString()
      };
    } catch (error) {
      throw this.wrap("getMetadata", error);
    }
  }

  private wrap(operation: string, error: unknown): StorageProviderError {
    if (error instanceof StorageProviderError) return error;
    return new StorageProviderError(
      `google-cloud-storage ${operation} failed: ${(error as Error).message}`,
      "google-cloud-storage"
    );
  }
}
