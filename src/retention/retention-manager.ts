import type { MetadataStore } from "../metadata/types.js";
import type { StorageProvider } from "../providers/interfaces/storage-provider.js";
import type { RetentionConfig } from "../config/types.js";

export interface RetentionTarget {
  provider: StorageProvider;
  retention: RetentionConfig;
}

/**
 * Applies retention policies per storage destination. The most recent
 * successful backup for a database is always protected, even if it is
 * older than the configured retention window, so a misconfigured retention
 * period can never delete the only remaining backup.
 */
export class RetentionManager {
  constructor(private readonly metadataStore: MetadataStore) {}

  async cleanup(database: string, target: RetentionTarget): Promise<string[]> {
    if (target.retention.days === "unlimited") {
      return [];
    }

    const backups = await this.metadataStore.list(database);
    const successful = backups
      .filter((b) => b.status === "success" || b.status === "partial")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (successful.length === 0) return [];

    const latest = successful[0]!;
    const cutoff = Date.now() - target.retention.days * 24 * 60 * 60 * 1000;

    const deletedIds: string[] = [];

    for (const backup of successful) {
      if (backup.backupId === latest.backupId) continue;
      if (new Date(backup.createdAt).getTime() >= cutoff) continue;

      const destination = backup.destinations.find(
        (d) => d.provider === target.provider.name && d.status === "success" && d.remoteFileId
      );
      if (!destination?.remoteFileId) continue;

      await target.provider.delete(destination.remoteFileId);
      deletedIds.push(backup.backupId);

      const remainingDestinations = backup.destinations.filter((d) => d.provider !== target.provider.name);
      const stillExistsElsewhere = remainingDestinations.some((d) => d.status === "success");

      if (!stillExistsElsewhere) {
        await this.metadataStore.delete(backup.backupId);
      } else {
        await this.metadataStore.update(backup.backupId, {
          destinations: backup.destinations.map((d) =>
            d.provider === target.provider.name ? { ...d, status: "failed" as const, remoteFileId: undefined } : d
          )
        });
      }
    }

    return deletedIds;
  }
}
