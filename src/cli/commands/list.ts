import { MongoBackup } from "../../core/backup-manager.js";
import { loadConfig } from "../config-loader.js";

export async function listCommand(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const backup = new MongoBackup(config);
  const backups = await backup.list();

  if (backups.length === 0) {
    console.log("No backups found.");
    return;
  }

  for (const entry of backups) {
    console.log(
      `${entry.backupId}  ${entry.createdAt}  ${entry.status}  ${(entry.compressedSizeBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }
}
