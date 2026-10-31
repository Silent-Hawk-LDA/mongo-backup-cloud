import { MongoBackup } from "../../core/backup-manager.js";
import { loadConfig } from "../config-loader.js";

export interface RestoreCommandOptions {
  backupId: string;
  yes?: boolean;
  targetDatabase?: string;
  config?: string;
}

export async function restoreCommand(options: RestoreCommandOptions): Promise<void> {
  if (!options.yes) {
    console.error(
      "Restore is a destructive operation. Re-run with --yes to confirm you want to restore " +
        `backup "${options.backupId}".`
    );
    process.exitCode = 1;
    return;
  }

  const config = await loadConfig(options.config);
  const backup = new MongoBackup(config);

  await backup.restore({
    backupId: options.backupId,
    confirm: true,
    targetDatabase: options.targetDatabase
  });

  console.log(`Backup ${options.backupId} restored successfully.`);
}
