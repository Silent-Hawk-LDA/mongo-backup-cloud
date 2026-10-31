import { MongoBackup } from "../../core/backup-manager.js";
import { loadConfig } from "../config-loader.js";

export async function cleanupCommand(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const backup = new MongoBackup(config);
  const deleted = await backup.cleanup();

  console.log(
    deleted.length === 0
      ? "No backups were eligible for cleanup."
      : `Deleted ${deleted.length} backup(s): ${deleted.join(", ")}`
  );
}
