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

  it("accepts a valid DigitalOcean Spaces config", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: {
          provider: "digitalocean-spaces",
          bucket: "my-space",
          region: "nyc3",
          credentials: { accessKeyId: "id", secretAccessKey: "secret" }
        }
      })
    ).not.toThrow();
  });

  it("rejects DigitalOcean Spaces without credentials", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: { provider: "digitalocean-spaces", bucket: "my-space", region: "nyc3" } as unknown as MongoBackupConfig["storage"]
      })
    ).toThrow(ConfigError);
  });

  it("accepts a valid Google Cloud Storage config", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: {
          provider: "google-cloud-storage",
          bucket: "my-bucket",
          credentials: { client_email: "a@b.iam.gserviceaccount.com", private_key: "x" }
        }
      })
    ).not.toThrow();
  });

  it("rejects Google Cloud Storage without a bucket", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: { provider: "google-cloud-storage", credentials: {} } as unknown as MongoBackupConfig["storage"]
      })
    ).toThrow(ConfigError);
  });

  it("accepts a valid Azure Blob config using a connection string", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: {
          provider: "azure-blob",
          container: "backups",
          connectionString: "DefaultEndpointsProtocol=https;AccountName=x;AccountKey=y;EndpointSuffix=core.windows.net"
        }
      })
    ).not.toThrow();
  });

  it("accepts a valid Azure Blob config using account name/key", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: {
          provider: "azure-blob",
          container: "backups",
          accountName: "myaccount",
          accountKey: "key"
        }
      })
    ).not.toThrow();
  });

  it("rejects Azure Blob without connection string or account credentials", () => {
    expect(() =>
      validateConfig({
        ...baseConfig,
        storage: { provider: "azure-blob", container: "backups" } as unknown as MongoBackupConfig["storage"]
      })
    ).toThrow(ConfigError);
  });
});
