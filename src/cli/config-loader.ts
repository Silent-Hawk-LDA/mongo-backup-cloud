import { access } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ConfigError } from "../errors/index.js";
import type { MongoBackupConfig } from "../config/types.js";

const CANDIDATE_FILES = [
  "mongo-backup-cloud.config.js",
  "mongo-backup-cloud.config.mjs",
  "mongo-backup-cloud.config.json"
];

export async function loadConfig(explicitPath?: string): Promise<MongoBackupConfig> {
  const candidate = explicitPath ?? (await findConfigFile());
  if (!candidate) {
    throw new ConfigError(
      "No configuration file found. Run `mongo-backup-cloud init` to create one, or pass --config <path>."
    );
  }

  if (candidate.endsWith(".json")) {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(candidate, "utf8")) as MongoBackupConfig;
  }

  const module = await import(pathToFileURL(candidate).href);
  return (module.default ?? module.config) as MongoBackupConfig;
}

async function findConfigFile(): Promise<string | undefined> {
  for (const fileName of CANDIDATE_FILES) {
    const fullPath = join(process.cwd(), fileName);
    try {
      await access(fullPath);
      return fullPath;
    } catch {
      continue;
    }
  }
  return undefined;
}
