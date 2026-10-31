export { MongoBackup } from "./core/backup-manager.js";
export type { BackupRunResult } from "./core/backup-manager.js";
export type { RestoreOptions } from "./core/restore-engine.js";

export type {
  MongoBackupConfig,
  MongoConnectionConfig,
  StorageConfig,
  LocalStorageConfig,
  S3StorageConfig,
  CloudflareR2StorageConfig,
  BackblazeB2StorageConfig,
  GoogleDriveStorageConfig,
  DropboxStorageConfig,
  ScheduleConfig,
  RetentionConfig,
  EncryptionConfig,
  CompressionConfig
} from "./config/types.js";

export type {
  BackupMetadata,
  BackupStatus,
  UploadResult,
  UploadStatus,
  MetadataStore
} from "./metadata/types.js";

export type { StorageProvider, RemoteFileInfo } from "./providers/interfaces/storage-provider.js";

export type {
  MongoBackupEventMap,
  MongoBackupEventName,
  BackupStartEvent,
  BackupSuccessEvent,
  BackupErrorEvent,
  UploadSuccessEvent,
  UploadErrorEvent,
  RestoreStartEvent,
  RestoreSuccessEvent,
  RestoreErrorEvent,
  CleanupCompleteEvent
} from "./events/types.js";

export {
  MongoBackupError,
  ConfigError,
  MongoToolError,
  StorageProviderError,
  EncryptionError,
  ChecksumMismatchError,
  BackupNotFoundError,
  RestoreConfirmationRequiredError
} from "./errors/index.js";

export { generateEncryptionKey } from "./encryption/aes.js";
