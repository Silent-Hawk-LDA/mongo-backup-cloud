import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BackupEngine } from "./backup-engine.js";
import { RestoreEngine, type RestoreOptions } from "./restore-engine.js";
import { Scheduler } from "./scheduler.js";
import { RetentionManager } from "../retention/retention-manager.js";
import { JsonMetadataStore } from "../metadata/json-metadata-store.js";
import { TypedEventEmitter } from "../events/emitter.js";
import { createStorageProvider } from "../providers/registry.js";
import { validateConfig, normalizeStorageConfigs } from "../config/validate.js";
import { generateBackupId } from "../utils/paths.js";
import { BackupNotFoundError } from "../errors/index.js";
import type { MongoBackupConfig, StorageConfig } from "../config/types.js";
import type { MetadataStore, BackupMetadata, UploadResult } from "../metadata/types.js";
import type { StorageProvider } from "../providers/interfaces/storage-provider.js";
import type { MongoBackupEventMap, MongoBackupEventName } from "../events/types.js";

export interface BackupRunResult {
  metadata: BackupMetadata;
}

interface Destination {
  config: StorageConfig;
  provider: StorageProvider;
  required: boolean;
}

/**
 * Top-level facade: `new MongoBackup(config)`. Wires together the backup
 * engine, restore engine, scheduler, retention manager, metadata store and
 * storage providers behind one typed, event-emitting API.
 */
export class MongoBackup {
  private readonly config: MongoBackupConfig;
  private readonly destinations: Destination[];
  private readonly metadataStore: MetadataStore;
  private readonly events = new TypedEventEmitter();
  private readonly scheduler = new Scheduler();
  private readonly tempDir: string;

  constructor(config: MongoBackupConfig) {
    validateConfig(config);
    this.config = config;
    this.destinations = normalizeStorageConfigs(config.storage).map((storageConfig) => ({
      config: storageConfig,
      provider: createStorageProvider(storageConfig),
      required: storageConfig.required ?? true
    }));
    this.metadataStore = new JsonMetadataStore(
      config.metadataPath ?? join(process.cwd(), ".mongo-backup-cloud", "metadata.json")
    );
    this.tempDir = config.tempDir ?? join(tmpdir(), "mongo-backup-cloud");
  }

  on<E extends MongoBackupEventName>(
    event: E,
    listener: (payload: MongoBackupEventMap[E]) => void
  ): this {
    this.events.on(event, listener);
    return this;
  }

  async start(): Promise<void> {
    if (!this.config.schedule?.enabled) return;
    this.scheduler.start(
      this.config.schedule.cron,
      async () => {
        await this.backup();
      },
      this.config.schedule.timezone
    );
  }

  async stop(): Promise<void> {
    this.scheduler.stop();
  }

  async backup(): Promise<BackupRunResult> {
    const backupId = generateBackupId(this.config.mongodb.database);
    const startedAt = new Date();

    this.events.emit("backup:start", {
      backupId,
      database: this.config.mongodb.database,
      startedAt
    });

    const engine = new BackupEngine({
      mongodb: this.config.mongodb,
      tempDir: this.tempDir,
      compressionLevel: this.config.compression?.level,
      encryption: this.config.encryption
    });

    let metadata: BackupMetadata = {
      backupId,
      database: this.config.mongodb.database,
      createdAt: startedAt.toISOString(),
      originalSizeBytes: 0,
      compressedSizeBytes: 0,
      checksum: "",
      encrypted: false,
      durationMs: 0,
      status: "pending",
      destinations: this.destinations.map((d) => ({
        provider: d.provider.name,
        required: d.required,
        status: "pending",
        attempts: 0
      }))
    };
    await this.metadataStore.save(metadata);

    try {
      const artifact = await engine.dump(backupId);

      const uploadResults = await Promise.all(
        this.destinations.map((destination) => this.uploadWithRetry(backupId, artifact.filePath, destination))
      );

      const requiredFailed = uploadResults.some((r, i) => this.destinations[i]!.required && r.status === "failed");

      metadata = {
        ...metadata,
        originalSizeBytes: artifact.originalSizeBytes,
        compressedSizeBytes: artifact.compressedSizeBytes,
        checksum: artifact.checksum,
        encrypted: artifact.encrypted,
        durationMs: Date.now() - startedAt.getTime(),
        status: requiredFailed ? "failed" : uploadResults.every((r) => r.status === "success") ? "success" : "partial",
        destinations: uploadResults
      };
      await this.metadataStore.save(metadata);
      await rm(artifact.filePath, { force: true });

      if (metadata.status === "failed") {
        const error = new Error(`One or more required storage destinations failed for backup ${backupId}.`);
        this.events.emit("backup:error", { backupId, database: metadata.database, error });
        throw error;
      }

      this.events.emit("backup:success", { metadata });
      return { metadata };
    } catch (error) {
      await this.metadataStore.update(backupId, { status: "failed" }).catch(() => undefined);
      this.events.emit("backup:error", {
        backupId,
        database: this.config.mongodb.database,
        error: error as Error
      });
      throw error;
    }
  }

  private async uploadWithRetry(
    backupId: string,
    filePath: string,
    destination: Destination,
    maxAttempts = 3
  ): Promise<UploadResult> {
    const remoteFileName = filePath.split(/[\\/]/).pop()!;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const info = await destination.provider.upload(filePath, remoteFileName);
        const result: UploadResult = {
          provider: destination.provider.name,
          required: destination.required,
          status: "success",
          remoteFileId: info.id,
          uploadedAt: new Date().toISOString(),
          attempts: attempt
        };
        this.events.emit("upload:success", { backupId, provider: destination.provider.name, result });
        return result;
      } catch (error) {
        lastError = error as Error;
      }
    }

    this.events.emit("upload:error", {
      backupId,
      provider: destination.provider.name,
      error: lastError!,
      required: destination.required
    });

    return {
      provider: destination.provider.name,
      required: destination.required,
      status: "failed",
      error: lastError!.message,
      attempts: maxAttempts
    };
  }

  async list(database?: string): Promise<BackupMetadata[]> {
    return this.metadataStore.list(database ?? this.config.mongodb.database);
  }

  async restore(options: RestoreOptions): Promise<void> {
    const metadata = await this.metadataStore.get(options.backupId);
    if (!metadata) throw new BackupNotFoundError(options.backupId);

    const successfulDestination = metadata.destinations.find(
      (d) => d.status === "success" && d.remoteFileId
    );
    if (!successfulDestination) {
      throw new BackupNotFoundError(options.backupId);
    }

    const destination = this.destinations.find((d) => d.provider.name === successfulDestination.provider);
    if (!destination) throw new BackupNotFoundError(options.backupId);

    this.events.emit("restore:start", {
      backupId: options.backupId,
      targetDatabase: options.targetDatabase ?? metadata.database
    });

    const startedAt = Date.now();
    const engine = new RestoreEngine({
      mongodb: this.config.mongodb,
      tempDir: this.tempDir,
      encryption: this.config.encryption
    });

    try {
      await engine.restore(metadata, destination.provider, successfulDestination.remoteFileId!, options);
      this.events.emit("restore:success", {
        backupId: options.backupId,
        targetDatabase: options.targetDatabase ?? metadata.database,
        durationMs: Date.now() - startedAt
      });
    } catch (error) {
      this.events.emit("restore:error", { backupId: options.backupId, error: error as Error });
      throw error;
    }
  }

  async cleanup(): Promise<string[]> {
    if (!this.config.retention) return [];

    const retentionManager = new RetentionManager(this.metadataStore);
    const allDeleted: string[] = [];

    for (const destination of this.destinations) {
      const deleted = await retentionManager.cleanup(this.config.mongodb.database, {
        provider: destination.provider,
        retention: this.config.retention
      });
      allDeleted.push(...deleted);
      this.events.emit("cleanup:complete", { deletedBackupIds: deleted, provider: destination.provider.name });
    }

    return allDeleted;
  }
}
