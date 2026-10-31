import { createReadStream } from "node:fs";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { basename } from "node:path";
import { StorageProviderError } from "../../errors/index.js";
import type { RemoteFileInfo, StorageProvider } from "../interfaces/storage-provider.js";

export interface S3CompatibleOptions {
  bucket: string;
  region: string;
  prefix?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: { accessKeyId: string; secretAccessKey: string };
  providerName?: string;
}

/**
 * S3-compatible storage provider built on AWS SDK v3. Used directly for
 * Amazon S3, and reused (with a custom endpoint) for Cloudflare R2 and
 * Backblaze B2, which both expose S3-compatible APIs.
 *
 * `@aws-sdk/client-s3` and `@aws-sdk/lib-storage` are optional
 * dependencies: they are only imported when this provider is actually used,
 * so local-only consumers never need to install the AWS SDK.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name: string;
  private readonly options: S3CompatibleOptions;
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | undefined;

  constructor(options: S3CompatibleOptions) {
    this.options = options;
    this.name = options.providerName ?? "s3";
  }

  private async getClient() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        let S3Client: typeof import("@aws-sdk/client-s3").S3Client;
        try {
          ({ S3Client } = await import("@aws-sdk/client-s3"));
        } catch {
          throw new StorageProviderError(
            `The "${this.name}" provider requires the optional dependency "@aws-sdk/client-s3". Install it with: npm install @aws-sdk/client-s3 @aws-sdk/lib-storage`,
            this.name
          );
        }
        return new S3Client({
          region: this.options.region,
          endpoint: this.options.endpoint,
          forcePathStyle: this.options.forcePathStyle,
          credentials: this.options.credentials
        });
      })();
    }
    return this.clientPromise;
  }

  private key(remoteFileName: string): string {
    return this.options.prefix ? `${this.options.prefix}/${remoteFileName}` : remoteFileName;
  }

  async upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo> {
    try {
      const client = await this.getClient();
      const { Upload } = await import("@aws-sdk/lib-storage");
      const key = this.key(remoteFileName);

      const upload = new Upload({
        client,
        params: {
          Bucket: this.options.bucket,
          Key: key,
          Body: createReadStream(localFilePath)
        }
      });
      await upload.done();

      return this.getMetadata(key);
    } catch (error) {
      throw this.wrap("upload", error);
    }
  }

  async download(remoteFileId: string, destinationPath: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const response = await client.send(
        new GetObjectCommand({ Bucket: this.options.bucket, Key: remoteFileId })
      );
      if (!response.Body) throw new Error("Empty response body from S3-compatible storage.");
      await pipeline(
        response.Body as NodeJS.ReadableStream,
        createWriteStream(destinationPath)
      );
    } catch (error) {
      throw this.wrap("download", error);
    }
  }

  async list(): Promise<RemoteFileInfo[]> {
    try {
      const client = await this.getClient();
      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      const response = await client.send(
        new ListObjectsV2Command({ Bucket: this.options.bucket, Prefix: this.options.prefix })
      );
      return (response.Contents ?? []).map((object) => ({
        id: object.Key ?? "",
        name: basename(object.Key ?? ""),
        sizeBytes: object.Size ?? 0,
        createdAt: (object.LastModified ?? new Date()).toISOString()
      }));
    } catch (error) {
      throw this.wrap("list", error);
    }
  }

  async delete(remoteFileId: string): Promise<void> {
    try {
      const client = await this.getClient();
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(
        new DeleteObjectCommand({ Bucket: this.options.bucket, Key: remoteFileId })
      );
    } catch (error) {
      throw this.wrap("delete", error);
    }
  }

  async getMetadata(remoteFileId: string): Promise<RemoteFileInfo> {
    try {
      const client = await this.getClient();
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      const response = await client.send(
        new HeadObjectCommand({ Bucket: this.options.bucket, Key: remoteFileId })
      );
      return {
        id: remoteFileId,
        name: basename(remoteFileId),
        sizeBytes: response.ContentLength ?? 0,
        createdAt: (response.LastModified ?? new Date()).toISOString()
      };
    } catch (error) {
      throw this.wrap("getMetadata", error);
    }
  }

  private wrap(operation: string, error: unknown): StorageProviderError {
    if (error instanceof StorageProviderError) return error;
    return new StorageProviderError(
      `${this.name} ${operation} failed: ${(error as Error).message}`,
      this.name
    );
  }
}
