import { writeFile, access } from "node:fs/promises";
import { join } from "node:path";
import { generateEncryptionKey } from "../../encryption/aes.js";

const TEMPLATE = `/** @type {import("@silent-hawk/mongo-backup-cloud").MongoBackupConfig} */
export default {
  mongodb: {
    uri: process.env.MONGODB_URI,
    database: "my_database"
  },
  storage: {
    provider: "local",
    path: "./mongodb-backups"
  },
  schedule: {
    enabled: false,
    cron: "0 2 * * *",
    timezone: "Europe/Lisbon"
  },
  retention: {
    days: 30
  }
};
`;

export async function initCommand(): Promise<void> {
  const target = join(process.cwd(), "mongo-backup-cloud.config.js");

  try {
    await access(target);
    console.log("mongo-backup-cloud.config.js already exists. Skipping.");
    return;
  } catch {
    // Does not exist yet; continue.
  }

  await writeFile(target, TEMPLATE, "utf8");
  console.log("Created mongo-backup-cloud.config.js");
  console.log("\nIf you plan to enable encryption, here is a generated key (store it securely,");
  console.log("e.g. as the BACKUP_ENCRYPTION_KEY environment variable):\n");
  console.log(generateEncryptionKey());
}
