export interface RemoteFileInfo {
  id: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Implemented by every storage backend (local disk, S3, R2, B2, Google
 * Drive, Dropbox, ...). The backup engine and CLI depend only on this
 * interface, never on a specific provider, so new providers can be added
 * without touching core code.
 */
export interface StorageProvider {
  readonly name: string;

  upload(localFilePath: string, remoteFileName: string): Promise<RemoteFileInfo>;
  download(remoteFileId: string, destinationPath: string): Promise<void>;
  list(): Promise<RemoteFileInfo[]>;
  delete(remoteFileId: string): Promise<void>;
  getMetadata(remoteFileId: string): Promise<RemoteFileInfo>;
}
