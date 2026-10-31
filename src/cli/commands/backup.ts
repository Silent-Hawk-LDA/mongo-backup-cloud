import { MongoBackup } from "../../core/backup-manager.js";
import { loadConfig } from "../config-loader.js";

export async function backupCommand(configPath?: string): Promise<void> {
  const config = await loadConfig(configPath);
  const backup = new MongoBackup(config);

  backup.on("upload:success", ({ provider }) => console.log(`  uploaded -> ${provider}`));
  backup.on("upload:error", ({ provider, error }) => console.error(`  failed -> ${provider}: ${error.message}`));

  const { metadata } = await backup.backup();
  console.log(`Backup ${metadata.backupId} completed with status "${metadata.status}".`);
}
