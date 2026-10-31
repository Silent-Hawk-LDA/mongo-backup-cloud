import { createWriteStream } from "node:fs";
import { ConfigError, StorageProviderError } from "../../errors/index.js";
import type { RemoteFileInfo, StorageProvider } from "../interfaces/storage-provider.js";

export interface AzureBlobProviderOptions {
  container: string;
  prefix?: string;
  connectionString?: string;
  accountName?: string;
  accountKey?: string;
}

/**
 * Azure Blob Storage provider, authenticated via either a connection
 * string or an account name/key pair. `@azure/storage-blob` is an optional
 * dependency, imported lazily so it is never required for consumers who
 * don't use this provider.
 */
export class AzureBlobProvider implements StorageProvider {
  readonly name = "azure-blob";
  private readonly options: AzureBlobProviderOptions;
  private containerPromise: Promise<import("@azure/storage-blob").ContainerClient> | undefined;

  constructor(options: AzureBlobProviderOptions) {
    this.options = options;
  }

  private async getContainer() {
    if (!this.containerPromise) {
      this.containerPromise = (async () => {
        let BlobServiceClient: typeof import("@azure/storage-blob").BlobServiceClient;
        let StorageSharedKeyCredential: typeof import("@azure/storage-blob").StorageSharedKeyCredential;
        try {
          ({ BlobServiceClient, StorageSharedKeyCredential } = await import("@azure/storage-blob"));
        } catch {
          throw new StorageProviderError(
            'The "azure-blob" provider requires the optional dependency "@azure/storage-blob". Install it with: npm install @azure/storage-blob',
            "azure-blob"
          );
        }

        let serviceClient: import("@azure/storage-blob").BlobServiceClient;
        if (this.options.connectionString) {
          serviceClient = BlobServiceClient.fromConnectionString(this.options.connectionString);
        } else if (this.options.accountName && this.options.accountKey) {
          const credential = new StorageSharedKeyCredential(
            this.options.accountName,
            this.options.accountKey
          );
          serviceClient = new BlobServiceClient(
            `https://${this.options.accountName}.blob.core.windows.net`,
            credential
          );
        } else {
          throw new ConfigError(
            "Azure Blob storage requires either `connectionString`, or both `accountName` and `accountKey`."
          );
        }

        const container = serviceClient.getContainerClient(this.options.container);
        await container.createIfNotExists();
        return container;
      })();
    }
    return this.containerPromise;
  }

  private key(remoteFileName: string): string {
    return this.options.prefix ? `${this.options.prefix}/${remoteFileName}` : remoteFileName;
  }

  async upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo> {
    try {
      const container = await this.getContainer();
      const key = this.key(remoteFileName);
      const blockBlobClient = container.getBlockBlobClient(key);
      await blockBlobClient.uploadFile(localFilePath);
      return this.getMetadata(key);
    } catch (error) {
      throw this.wrap("upload", error);
    }
  }

  async download(remoteFileId: string, destinationPath: string): Promise<void> {
    try {
      const container = await this.getContainer();
      const blockBlobClient = container.getBlockBlobClient(remoteFileId);
      const downloadResponse = await blockBlobClient.download();
      if (!downloadResponse.readableStreamBody) {
        throw new Error("Empty response body from Azure Blob Storage.");
      }
      await new Promise<void>((resolve, reject) => {
        (downloadResponse.readableStreamBody as NodeJS.ReadableStream)
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
      const container = await this.getContainer();
      const infos: RemoteFileInfo[] = [];
      for await (const blob of container.listBlobsFlat({ prefix: this.options.prefix })) {
        infos.push({
          id: blob.name,
          name: blob.name.split("/").pop() ?? blob.name,
          sizeBytes: blob.properties.contentLength ?? 0,
          createdAt: (blob.properties.createdOn ?? new Date()).toISOString()
        });
      }
      return infos;
    } catch (error) {
      throw this.wrap("list", error);
    }
  }

  async delete(remoteFileId: string): Promise<void> {
    try {
      const container = await this.getContainer();
      await container.getBlockBlobClient(remoteFileId).deleteIfExists();
    } catch (error) {
      throw this.wrap("delete", error);
    }
  }

  async getMetadata(remoteFileId: string): Promise<RemoteFileInfo> {
    try {
      const container = await this.getContainer();
      const blockBlobClient = container.getBlockBlobClient(remoteFileId);
      const properties = await blockBlobClient.getProperties();
      return {
        id: remoteFileId,
        name: remoteFileId.split("/").pop() ?? remoteFileId,
        sizeBytes: properties.contentLength ?? 0,
        createdAt: (properties.createdOn ?? new Date()).toISOString()
      };
    } catch (error) {
      throw this.wrap("getMetadata", error);
    }
  }

  private wrap(operation: string, error: unknown): StorageProviderError {
    if (error instanceof StorageProviderError) return error;
    return new StorageProviderError(`azure-blob ${operation} failed: ${(error as Error).message}`, "azure-blob");
  }
}
