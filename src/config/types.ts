export interface MongoConnectionConfig {
  uri: string;
  database: string;
  collections?: string[];
  timeoutMs?: number;
}

export interface LocalStorageConfig {
  provider: "local";
  path: string;
  required?: boolean;
}

export interface S3StorageConfig {
  provider: "s3";
  bucket: string;
  region: string;
  prefix?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  required?: boolean;
}

export interface CloudflareR2StorageConfig {
  provider: "cloudflare-r2";
  bucket: string;
  accountId: string;
  prefix?: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  required?: boolean;
}

export interface BackblazeB2StorageConfig {
  provider: "backblaze-b2";
  bucket: string;
  region: string;
  endpoint: string;
  prefix?: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  required?: boolean;
}

export interface GoogleDriveStorageConfig {
  provider: "google-drive";
  credentials: string | Record<string, unknown>;
  folderId: string;
  required?: boolean;
}

export interface DropboxStorageConfig {
  provider: "dropbox";
  accessToken: string;
  folder: string;
  required?: boolean;
}

export type StorageConfig =
  | LocalStorageConfig
  | S3StorageConfig
  | CloudflareR2StorageConfig
  | BackblazeB2StorageConfig
  | GoogleDriveStorageConfig
  | DropboxStorageConfig;

export interface ScheduleConfig {
  enabled: boolean;
  cron: string;
  timezone?: string;
}

export interface RetentionConfig {
  days: number | "unlimited";
}

export interface EncryptionConfig {
  enabled: boolean;
  key?: string;
}

export interface CompressionConfig {
  level?: number;
}

export interface MongoBackupConfig {
  mongodb: MongoConnectionConfig;
  storage: StorageConfig | StorageConfig[];
  schedule?: ScheduleConfig;
  retention?: RetentionConfig;
  encryption?: EncryptionConfig;
  compression?: CompressionConfig;
  metadataPath?: string;
  tempDir?: string;
}
