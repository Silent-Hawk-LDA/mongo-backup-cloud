import { S3StorageProvider } from "../s3/s3-provider.js";
import type { DigitalOceanSpacesStorageConfig } from "../../config/types.js";

/**
 * DigitalOcean Spaces exposes an S3-compatible API, so this provider is a
 * thin wrapper around {@link S3StorageProvider} configured with Spaces'
 * regional endpoint.
 */
export class DigitalOceanSpacesProvider extends S3StorageProvider {
  constructor(config: Omit<DigitalOceanSpacesStorageConfig, "provider" | "required">) {
    super({
      bucket: config.bucket,
      region: config.region,
      prefix: config.prefix,
      endpoint: `https://${config.region}.digitaloceanspaces.com`,
      forcePathStyle: false,
      credentials: config.credentials,
      providerName: "digitalocean-spaces"
    });
  }
}
