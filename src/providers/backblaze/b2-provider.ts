import { S3StorageProvider } from "../s3/s3-provider.js";
import type { BackblazeB2StorageConfig } from "../../config/types.js";

/**
 * Backblaze B2 exposes an S3-compatible API, so this provider is a thin
 * wrapper around {@link S3StorageProvider} configured with B2's endpoint.
 */
export class BackblazeB2Provider extends S3StorageProvider {
  constructor(config: Omit<BackblazeB2StorageConfig, "provider" | "required">) {
    super({
      bucket: config.bucket,
      region: config.region,
      prefix: config.prefix,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: config.credentials,
      providerName: "backblaze-b2"
    });
  }
}
