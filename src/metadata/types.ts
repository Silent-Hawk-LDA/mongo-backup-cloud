export type BackupStatus = "pending" | "success" | "partial" | "failed";
export type UploadStatus = "pending" | "success" | "failed";

export interface UploadResult {
  provider: string;
  required: boolean;
  status: UploadStatus;
  remoteFileId?: string;
  uploadedAt?: string;
  error?: string;
  attempts: number;
}

export interface BackupMetadata {
  backupId: string;
  database: string;
  createdAt: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  checksum: string;
  encrypted: boolean;
  durationMs: number;
  status: BackupStatus;
  destinations: UploadResult[];
}

/**
 * Provider-independent metadata storage abstraction. A local JSON
 * implementation is provided; database-backed implementations (e.g. MongoDB
 * itself, Redis, Postgres) can implement the same interface.
 */
export interface MetadataStore {
  save(metadata: BackupMetadata): Promise<void>;
  update(backupId: string, patch: Partial<BackupMetadata>): Promise<void>;
  get(backupId: string): Promise<BackupMetadata | undefined>;
  list(database?: string): Promise<BackupMetadata[]>;
  delete(backupId: string): Promise<void>;
}
