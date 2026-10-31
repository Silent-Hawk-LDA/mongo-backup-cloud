import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/config/validate.js";
import { ConfigError } from "../src/errors/index.js";
import type { MongoBackupConfig } from "../src/config/types.js";

const baseConfig: MongoBackupConfig = {
  mongodb: { uri: "mongodb://localhost:27017", database: "db" },
  storage: { provider: "local", path: "./backups" }
};

describe("validateConfig", () => {
  it("accepts a minimal valid config", () => {
    expect(() => validateConfig(baseConfig)).not.toThrow();
  });

  it("rejects a missing mongodb uri", () => {
    expect(() =>
      validateConfig({ ...baseConfig, mongodb: { uri: "", database: "db" } })
    ).toThrow(ConfigError);
  });

  it("rejects an unsupported provider", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: { provider: "unsupported" } as unknown as MongoBackupConfig["storage"]
      })
    ).toThrow(ConfigError);
  });

  it("rejects scheduling enabled without a cron expression", () => {
    expect(() =>
      validateConfig({ ...baseConfig, schedule: { enabled: true, cron: "" } })
    ).toThrow(ConfigError);
  });

  it("rejects encryption enabled without a key", () => {
    delete process.env.BACKUP_ENCRYPTION_KEY;
    expect(() => validateConfig({ ...baseConfig, encryption: { enabled: true } })).toThrow(ConfigError);
  });
});
