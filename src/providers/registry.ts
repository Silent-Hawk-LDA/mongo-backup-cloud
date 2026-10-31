import { ConfigError } from "../errors/index.js";
import type { StorageConfig } from "../config/types.js";
import type { StorageProvider } from "./interfaces/storage-provider.js";
import { LocalStorageProvider } from "./local/local-provider.js";
import { S3StorageProvider } from "./s3/s3-provider.js";
import { CloudflareR2Provider } from "./cloudflare-r2/r2-provider.js";
import { BackblazeB2Provider } from "./backblaze/b2-provider.js";
import { GoogleDriveProvider } from "./google-drive/google-drive-provider.js";
import { DropboxProvider } from "./dropbox/dropbox-provider.js";

export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case "local":
      return new LocalStorageProvider({ path: config.path });
    case "s3":
      return new S3StorageProvider({
        bucket: config.bucket,
        region: config.region,
        prefix: config.prefix,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: config.credentials,
        providerName: "s3"
      });
    case "cloudflare-r2":
      return new CloudflareR2Provider(config);
    case "backblaze-b2":
      return new BackblazeB2Provider(config);
    case "google-drive":
      return new GoogleDriveProvider({ credentials: config.credentials, folderId: config.folderId });
    case "dropbox":
      return new DropboxProvider({ accessToken: config.accessToken, folder: config.folder });
    default:
      throw new ConfigError(`Unsupported storage provider: "${(config as StorageConfig).provider}"`);
  }
}

export const SUPPORTED_PROVIDER_NAMES = [
  "local",
  "s3",
  "cloudflare-r2",
  "backblaze-b2",
  "google-drive",
  "dropbox"
] as const;
