import { ConfigError } from "../errors/index.js";
import type { MongoBackupConfig, StorageConfig } from "./types.js";

const SUPPORTED_PROVIDERS = [
  "local",
  "s3",
  "cloudflare-r2",
  "backblaze-b2",
  "digitalocean-spaces",
  "google-cloud-storage",
  "azure-blob",
  "google-drive",
  "dropbox"
];

function validateStorageConfig(storage: StorageConfig): void {
  if (!SUPPORTED_PROVIDERS.includes(storage.provider)) {
    throw new ConfigError(`Unsupported storage provider: "${storage.provider}"`);
  }

  switch (storage.provider) {
    case "local":
      if (!storage.path) throw new ConfigError("Local storage requires a `path`.");
      break;
    case "s3":
      if (!storage.bucket || !storage.region) {
        throw new ConfigError("S3 storage requires `bucket` and `region`.");
      }
      break;
    case "cloudflare-r2":
      if (!storage.bucket || !storage.accountId || !storage.credentials) {
        throw new ConfigError(
          "Cloudflare R2 storage requires `bucket`, `accountId` and `credentials`."
        );
      }
      break;
    case "backblaze-b2":
      if (!storage.bucket || !storage.endpoint || !storage.credentials) {
        throw new ConfigError(
          "Backblaze B2 storage requires `bucket`, `endpoint` and `credentials`."
        );
      }
      break;
    case "digitalocean-spaces":
      if (!storage.bucket || !storage.region || !storage.credentials) {
        throw new ConfigError(
          "DigitalOcean Spaces storage requires `bucket`, `region` and `credentials`."
        );
      }
      break;
    case "google-cloud-storage":
      if (!storage.bucket || !storage.credentials) {
        throw new ConfigError("Google Cloud Storage requires `bucket` and `credentials`.");
      }
      break;
    case "azure-blob":
      if (!storage.container || (!storage.connectionString && !(storage.accountName && storage.accountKey))) {
        throw new ConfigError(
          "Azure Blob storage requires `container`, and either `connectionString` or both `accountName` and `accountKey`."
        );
      }
      break;
    case "google-drive":
      if (!storage.credentials || !storage.folderId) {
        throw new ConfigError("Google Drive storage requires `credentials` and `folderId`.");
      }
      break;
    case "dropbox":
      if (!storage.accessToken || !storage.folder) {
        throw new ConfigError("Dropbox storage requires `accessToken` and `folder`.");
      }
      break;
  }
}

export function validateConfig(config: MongoBackupConfig): void {
  if (!config.mongodb?.uri) {
    throw new ConfigError("`mongodb.uri` is required.");
  }
  if (!config.mongodb?.database) {
    throw new ConfigError("`mongodb.database` is required.");
  }

  const destinations = Array.isArray(config.storage) ? config.storage : [config.storage];
  if (destinations.length === 0) {
    throw new ConfigError("At least one storage destination must be configured.");
  }
  destinations.forEach(validateStorageConfig);

  if (config.schedule?.enabled && !config.schedule.cron) {
    throw new ConfigError("`schedule.cron` is required when scheduling is enabled.");
  }

  if (config.encryption?.enabled && !config.encryption.key && !process.env.BACKUP_ENCRYPTION_KEY) {
    throw new ConfigError(
      "Encryption is enabled but no key was provided (set `encryption.key` or BACKUP_ENCRYPTION_KEY)."
    );
  }
}

export function normalizeStorageConfigs(storage: StorageConfig | StorageConfig[]): StorageConfig[] {
  return Array.isArray(storage) ? storage : [storage];
}
