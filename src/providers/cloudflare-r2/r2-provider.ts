import { S3StorageProvider } from "../s3/s3-provider.js";
import type { CloudflareR2StorageConfig } from "../../config/types.js";

/**
 * Cloudflare R2 exposes an S3-compatible API, so this provider is a thin
 * wrapper around {@link S3StorageProvider} configured with R2's account
 * endpoint.
 */
export class CloudflareR2Provider extends S3StorageProvider {
  constructor(config: Omit<CloudflareR2StorageConfig, "provider" | "required">) {
    super({
      bucket: config.bucket,
      region: "auto",
      prefix: config.prefix,
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: config.credentials,
      providerName: "cloudflare-r2"
    });
  }
}
