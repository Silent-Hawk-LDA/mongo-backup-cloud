import type { BackupMetadata, UploadResult } from "../metadata/types.js";

export interface BackupStartEvent {
  backupId: string;
  database: string;
  startedAt: Date;
}

export interface BackupSuccessEvent {
  metadata: BackupMetadata;
}

export interface BackupErrorEvent {
  backupId: string;
  database: string;
  error: Error;
}

export interface UploadSuccessEvent {
  backupId: string;
  provider: string;
  result: UploadResult;
}

export interface UploadErrorEvent {
  backupId: string;
  provider: string;
  error: Error;
  required: boolean;
}

export interface RestoreStartEvent {
  backupId: string;
  targetDatabase: string;
}

export interface RestoreSuccessEvent {
  backupId: string;
  targetDatabase: string;
  durationMs: number;
}

export interface RestoreErrorEvent {
  backupId: string;
  error: Error;
}

export interface CleanupCompleteEvent {
  deletedBackupIds: string[];
  provider?: string;
}

export interface MongoBackupEventMap {
  "backup:start": BackupStartEvent;
  "backup:success": BackupSuccessEvent;
  "backup:error": BackupErrorEvent;
  "upload:success": UploadSuccessEvent;
  "upload:error": UploadErrorEvent;
  "restore:start": RestoreStartEvent;
  "restore:success": RestoreSuccessEvent;
  "restore:error": RestoreErrorEvent;
  "cleanup:complete": CleanupCompleteEvent;
}

export type MongoBackupEventName = keyof MongoBackupEventMap;
