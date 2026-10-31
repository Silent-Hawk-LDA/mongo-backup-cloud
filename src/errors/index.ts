export class MongoBackupError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "MongoBackupError";
    this.code = code;
  }
}

export class ConfigError extends MongoBackupError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export class MongoToolError extends MongoBackupError {
  constructor(message: string) {
    super(message, "MONGO_TOOL_ERROR");
    this.name = "MongoToolError";
  }
}

export class StorageProviderError extends MongoBackupError {
  public readonly provider: string;

  constructor(message: string, provider: string) {
    super(message, "STORAGE_PROVIDER_ERROR");
    this.name = "StorageProviderError";
    this.provider = provider;
  }
}

export class EncryptionError extends MongoBackupError {
  constructor(message: string) {
    super(message, "ENCRYPTION_ERROR");
    this.name = "EncryptionError";
  }
}

export class ChecksumMismatchError extends MongoBackupError {
  constructor(message: string) {
    super(message, "CHECKSUM_MISMATCH");
    this.name = "ChecksumMismatchError";
  }
}

export class BackupNotFoundError extends MongoBackupError {
  constructor(backupId: string) {
    super(`Backup not found: ${backupId}`, "BACKUP_NOT_FOUND");
    this.name = "BackupNotFoundError";
  }
}

export class RestoreConfirmationRequiredError extends MongoBackupError {
  constructor() {
    super(
      "Restore is destructive and requires explicit confirmation (pass confirm: true).",
      "RESTORE_CONFIRMATION_REQUIRED"
    );
    this.name = "RestoreConfirmationRequiredError";
  }
}
