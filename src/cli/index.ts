import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initCommand } from "./commands/init.js";
import { backupCommand } from "./commands/backup.js";
import { listCommand } from "./commands/list.js";
import { restoreCommand } from "./commands/restore.js";
import { cleanupCommand } from "./commands/cleanup.js";
import { providersCommand } from "./commands/providers.js";
import { configCommand } from "./commands/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf8")) as {
  version: string;
};

const program = new Command();

program
  .name("mongo-backup-cloud")
  .description("Automated MongoDB backups to multiple cloud storage providers.")
  .version(pkg.version);

program
  .command("init")
  .description("Create a starter configuration file.")
  .action(() => initCommand());

program
  .command("backup")
  .description("Run a one-off backup.")
  .option("-c, --config <path>", "Path to a config file.")
  .action((opts) => backupCommand(opts.config));

program
  .command("list")
  .description("List existing backups.")
  .option("-c, --config <path>", "Path to a config file.")
  .action((opts) => listCommand(opts.config));

program
  .command("restore")
  .description("Restore a backup. Destructive: requires --yes.")
  .requiredOption("-b, --backup-id <id>", "Backup ID to restore.")
  .option("-c, --config <path>", "Path to a config file.")
  .option("-d, --target-database <name>", "Restore into a different database name.")
  .option("-y, --yes", "Confirm the destructive restore operation.")
  .action((opts) =>
    restoreCommand({
      backupId: opts.backupId,
      yes: opts.yes,
      targetDatabase: opts.targetDatabase,
      config: opts.config
    })
  );

program
  .command("cleanup")
  .description("Apply retention policies and delete expired backups.")
  .option("-c, --config <path>", "Path to a config file.")
  .action((opts) => cleanupCommand(opts.config));

program
  .command("providers")
  .description("List supported storage providers.")
  .action(() => providersCommand());

program
  .command("config")
  .description("Validate and print the resolved configuration.")
  .option("-c, --config <path>", "Path to a config file.")
  .action((opts) => configCommand(opts.config));

program.parseAsync(process.argv).catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
