# mongo-backup-cloud

Automated MongoDB backups to multiple cloud storage providers, with encryption, retention policies, scheduling and a CLI — built for Node.js and TypeScript projects.

[![npm version](https://img.shields.io/npm/v/mongo-backup-cloud.svg)](https://www.npmjs.com/package/mongo-backup-cloud)
[![npm downloads](https://img.shields.io/npm/dm/mongo-backup-cloud.svg)](https://www.npmjs.com/package/mongo-backup-cloud)
[![license](https://img.shields.io/npm/l/mongo-backup-cloud.svg)](./LICENSE)
[![build](https://github.com/Silent-Hawk-LDA/mongo-backup-cloud/actions/workflows/ci.yml/badge.svg)](https://github.com/Silent-Hawk-LDA/mongo-backup-cloud/actions/workflows/ci.yml)

## Key Features

- Full or selective MongoDB database backups using the official `mongodump`/`mongorestore` tools.
- Upload the same backup to one or many cloud storage providers at once.
- Gzip compression and optional AES-256-GCM encryption with SHA-256 checksum verification.
- Cron-based scheduling with timezone support and overlap prevention.
- Per-provider retention policies with automatic and manual cleanup.
- Typed lifecycle events for backup, upload, restore and cleanup.
- A standalone CLI — no JavaScript required to run backups.
- TypeScript-first, strict types, ESM and CommonJS builds, Node.js 20+.

## Supported Storage Providers

| Provider | Package | Notes |
| --- | --- | --- |
| Local disk | built-in | Reference implementation, no extra dependency |
| Amazon S3 | `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` | IAM role or access key/secret |
| Cloudflare R2 | `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` | S3-compatible |
| Backblaze B2 | `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` | S3-compatible |
| Google Drive | `googleapis` | Service Account authentication |
| Dropbox | `dropbox` | Access-token authentication |

Each provider's SDK is an **optional dependency** — install only what you use.

## Installation

```bash
npm install @silent-hawk/mongo-backup-cloud
```

Install the SDK for any cloud provider you use:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage   # S3, Cloudflare R2, Backblaze B2
npm install googleapis                                 # Google Drive
npm install dropbox                                     # Dropbox
```

Local storage requires no additional packages.

## Requirements and Prerequisites

- Node.js 20 or later.
- TypeScript 5+ (optional, for TypeScript projects).
- The MongoDB Database Tools installed and available on `PATH`:
  - [`mongodump`](https://www.mongodb.com/docs/database-tools/mongodump/)
  - [`mongorestore`](https://www.mongodb.com/docs/database-tools/mongorestore/)
- Network access and credentials for whichever storage provider(s) you configure.

## Quick Start

```bash
npm install @silent-hawk/mongo-backup-cloud
npx mongo-backup-cloud init
```

This creates `mongo-backup-cloud.config.js` in your project. Edit it to add your database connection and the storage provider of your choice — see [Getting Credentials for Each Provider](#getting-credentials-for-each-provider) for where to get each value — then run:

```bash
npx mongo-backup-cloud backup
```

Config files read credentials via `process.env.*`, so put secrets in a `.env` file (never commit it) and load it when running Node 20.6+:

```bash
node --env-file=.env ./node_modules/.bin/mongo-backup-cloud backup
```

or use a package like [`dotenv`](https://www.npmjs.com/package/dotenv)/[`dotenv-cli`](https://www.npmjs.com/package/dotenv-cli) if you're on an older Node version or already use it elsewhere in your project.

## TypeScript Example

```typescript
import { MongoBackup } from "@silent-hawk/mongo-backup-cloud";

const backup = new MongoBackup({
  mongodb: {
    uri: process.env.MONGODB_URI!,
    database: "my_database"
  },
  storage: {
    provider: "google-drive",
    credentials: "./credentials.json",
    folderId: "GOOGLE_DRIVE_FOLDER_ID"
  },
  schedule: {
    enabled: true,
    cron: "0 2 * * *",
    timezone: "Europe/Lisbon"
  },
  retention: {
    days: 30
  }
});

await backup.start();
```

## JavaScript Example

```javascript
const { MongoBackup } = require("@silent-hawk/mongo-backup-cloud");

const backup = new MongoBackup({
  mongodb: {
    uri: process.env.MONGODB_URI,
    database: "my_database"
  },
  storage: {
    provider: "local",
    path: "./mongodb-backups"
  }
});

backup.backup().then((result) => console.log(result.metadata));
```

## Getting Credentials for Each Provider

Every provider below needs credentials obtained from that provider's own console. Treat every value in this section as a secret: put it in a `.env` file (already covered by the `.gitignore` this package's `init` command does not create for you — add it yourself) or your platform's secrets manager, and never commit it or paste it into a config file directly. Reference it from your config via `process.env.*`, as every example in this README does.

### Google Drive

Google Drive authenticates with a **Service Account**, not your personal Google account.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and select or create a project.
2. Go to **APIs & Services → Library**, search for **Google Drive API**, and click **Enable**.
3. Go to **IAM & Admin → Service Accounts → Create Service Account**. Give it any name (e.g. `mongo-backup`); no project roles are required.
4. Open the new service account → **Keys** tab → **Add Key → Create new key → JSON**. This downloads a `credentials.json` file — this is your `storage.credentials` value (pass the file path, or its parsed JSON contents).
5. In Google Drive, create or choose a destination folder, right-click it → **Share**, and add the service account's email address (looks like `mongo-backup@your-project.iam.gserviceaccount.com`, found inside `credentials.json` as `client_email`) with **Editor** access. Uploads will fail with a permissions error if this step is skipped.
6. Get the folder ID from its URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`. This is your `storage.folderId`.
7. Store `credentials.json` outside version control (e.g. `./secrets/credentials.json`, gitignored) and reference its path in your config.

### Amazon S3

1. Sign in to the [AWS Console](https://console.aws.amazon.com/) and open **S3** → **Create bucket**. Note the bucket name and its region (e.g. `eu-west-1`) — these are your `storage.bucket` and `storage.region`.
2. Open **IAM → Users → Create user** (or reuse an existing user/role dedicated to backups).
3. Attach a policy scoped to only this bucket, for example:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
         "Resource": ["arn:aws:s3:::your-bucket-name", "arn:aws:s3:::your-bucket-name/*"]
       }
     ]
   }
   ```
4. Under the user's **Security credentials** tab → **Access keys → Create access key** (choose "Application running outside AWS" if prompted). Copy the **Access key ID** and **Secret access key** immediately — the secret is shown only once.
5. Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in your `.env` and reference them in `storage.credentials`.
6. If running on EC2, ECS, Lambda or another AWS compute service, skip steps 2–5 entirely: attach an IAM role with the same policy to the compute resource and omit `storage.credentials` — the AWS SDK picks up the role's credentials automatically.

### Cloudflare R2

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/) → **R2** → **Create bucket**. Note the bucket name.
2. On the R2 overview page, copy your **Account ID** — this is `storage.accountId`.
3. Go to **R2 → Manage R2 API Tokens → Create API Token**. Scope it to **Object Read & Write** on the bucket you created.
4. Copy the generated **Access Key ID** and **Secret Access Key** — shown once, like AWS.
5. R2 has no separate region concept for API calls; the provider derives the endpoint from `accountId` automatically.

### Backblaze B2

1. Sign in to your [Backblaze account](https://www.backblaze.com/) → **B2 Cloud Storage → Buckets → Create a Bucket**. Note the bucket name.
2. Go to **App Keys → Add a New Application Key**, scope it to the bucket you created, with read and write access.
3. Copy the generated **keyID** (→ `credentials.accessKeyId`) and **applicationKey** (→ `credentials.secretAccessKey`) — shown once.
4. On the bucket's details page, note its **Endpoint** (e.g. `s3.us-west-004.backblazeb2.com`) and the region implied by it (e.g. `us-west-004`) — these map to `storage.endpoint` (prefix with `https://`) and `storage.region`.

### Dropbox

1. Go to the [Dropbox App Console](https://www.dropbox.com/developers/apps) → **Create app**.
2. Choose **Scoped access**, then either **App folder** (isolated, recommended for backups) or **Full Dropbox** access.
3. Under the app's **Permissions** tab, enable `files.content.write` and `files.content.read`, then click **Submit**.
4. Under the **Settings** tab, click **Generate** under "Generated access token" for a quick token to get started. For production, implement Dropbox's OAuth 2 refresh-token flow instead, since generated tokens expire — the `dropbox` SDK this package uses accepts either.
5. Create (or note) the destination folder path inside Dropbox, e.g. `/mongodb-backups` — this is `storage.folder`.

## Google Drive Configuration

```typescript
storage: {
  provider: "google-drive",
  credentials: "./service-account.json", // path to a Service Account JSON key, or the parsed object
  folderId: "FOLDER_ID"
}
```

Share the destination Drive folder with the Service Account's email address so it has write access.

## Amazon S3 Configuration

```typescript
storage: {
  provider: "s3",
  bucket: "my-mongodb-backups",
  region: "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
}
```

Omit `credentials` entirely to use IAM role credentials (e.g. on EC2, ECS or Lambda) via the default AWS SDK credential chain.

## Cloudflare R2 Configuration

```typescript
storage: {
  provider: "cloudflare-r2",
  bucket: "mongodb-backups",
  accountId: process.env.R2_ACCOUNT_ID,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
}
```

## Backblaze B2 Configuration

```typescript
storage: {
  provider: "backblaze-b2",
  bucket: "mongodb-backups",
  region: "us-west-004",
  endpoint: "https://s3.us-west-004.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  }
}
```

## Dropbox Configuration

```typescript
storage: {
  provider: "dropbox",
  accessToken: process.env.DROPBOX_ACCESS_TOKEN,
  folder: "/mongodb-backups"
}
```

## Local Storage Configuration

```typescript
storage: {
  provider: "local",
  path: "./mongodb-backups"
}
```

## Multiple Storage Destination Example

Upload the same backup to several providers at once. Mark a destination `required: false` to allow the overall backup to succeed even if that specific destination fails.

```typescript
storage: [
  { provider: "google-drive", credentials: "./credentials.json", folderId: "DRIVE_FOLDER_ID" },
  { provider: "s3", bucket: "mongodb-backups", region: "eu-west-1" },
  { provider: "local", path: "./backups", required: false }
]
```

Destinations upload concurrently, retry independently (up to 3 attempts each) on failure, and the backup as a whole is only marked `"failed"` if a **required** destination could not be uploaded to. `backup.list()` and the `upload:success` / `upload:error` events report per-destination status.

## Scheduling Configuration

```typescript
schedule: {
  enabled: true,
  cron: "0 2 * * *", // daily at 02:00
  timezone: "Europe/Lisbon"
}
```

In-process scheduling (`backup.start()`) requires the host Node.js process to keep running. For production deployments, run it under a process manager:

- **PM2**: `pm2 start server.js --name mongo-backup`
- **Docker**: run the process as your container's `CMD`/`ENTRYPOINT` with a restart policy (`restart: unless-stopped`).
- **systemd**: create a unit with `Restart=on-failure` and `WantedBy=multi-user.target`.

Alternatively, skip in-process scheduling and invoke `mongo-backup-cloud backup` from an external cron, Kubernetes CronJob, or scheduled task.

## Retention Configuration

```typescript
retention: {
  days: 30 // 7, 30, 60, 90, any custom number of days, or "unlimited"
}
```

Retention is applied per storage destination. The most recent successful backup for a database is always protected, even past its retention window. Run `backup.cleanup()` or `mongo-backup-cloud cleanup` to apply the policy; expired backups are deleted automatically at the end of each scheduled run too.

## Compression and Encryption

```typescript
compression: {
  level: 6 // 0–9, defaults to zlib's default level
},
encryption: {
  enabled: true,
  key: process.env.BACKUP_ENCRYPTION_KEY // 64-character hex string (32 bytes)
}
```

Generate a key:

```bash
npx mongo-backup-cloud init   # prints a generated key
```

```typescript
import { generateEncryptionKey } from "@silent-hawk/mongo-backup-cloud";
console.log(generateEncryptionKey());
```

Backups are compressed with gzip, then optionally encrypted with AES-256-GCM using a unique IV per backup and an authentication tag verified on decrypt. **Store the encryption key separately from your backups** (e.g. a secrets manager) — it is never written into the backup file or logged.

## Manual Backup

```typescript
const result = await backup.backup();
console.log(result.metadata);
```

## Listing Backups

```typescript
const backups = await backup.list();
```

## Restore Instructions

Restoring is destructive and requires explicit confirmation:

```typescript
await backup.restore({
  backupId: "BACKUP_ID",
  confirm: true,
  targetDatabase: "my_database_restored" // optional: restore into a different database
});
```

Restore automatically selects any storage destination the backup was successfully uploaded to, verifies its SHA-256 checksum, decrypts and decompresses it, and runs `mongorestore`. Omitting `confirm: true` throws a `RestoreConfirmationRequiredError` instead of running.

## CLI Documentation

```bash
mongo-backup-cloud init                                  # create a config file
mongo-backup-cloud backup [-c <config>]                  # run a one-off backup
mongo-backup-cloud list [-c <config>]                    # list backups
mongo-backup-cloud restore -b <backupId> --yes           # restore a backup (destructive)
mongo-backup-cloud cleanup [-c <config>]                 # apply retention policy
mongo-backup-cloud providers                             # list supported providers
mongo-backup-cloud config [-c <config>]                  # validate and print config
```

The CLI reads `mongo-backup-cloud.config.js`/`.mjs`/`.json` from the current directory by default, or an explicit `--config <path>`. Secrets should come from environment variables referenced inside the config file, not hardcoded into it.

## Express Integration

```typescript
import express from "express";
import { MongoBackup } from "@silent-hawk/mongo-backup-cloud";

const app = express();
const backup = new MongoBackup({
  mongodb: { uri: process.env.MONGODB_URI!, database: "my_database" },
  storage: { provider: "local", path: "./backups" }
});

await backup.start();

app.post("/admin/backup", async (_req, res) => {
  const result = await backup.backup();
  res.json(result.metadata);
});
```

## NestJS Integration

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { MongoBackup } from "@silent-hawk/mongo-backup-cloud";

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly backup = new MongoBackup({
    mongodb: { uri: process.env.MONGODB_URI!, database: "my_database" },
    storage: { provider: "s3", bucket: "mongodb-backups", region: "eu-west-1" }
  });

  async onModuleInit() {
    await this.backup.start();
  }

  async onModuleDestroy() {
    await this.backup.stop();
  }

  runManualBackup() {
    return this.backup.backup();
  }
}
```

`mongo-backup-cloud` never requires Express or NestJS as a dependency — it is a plain Node.js class usable from any framework.

## Event Handling

```typescript
backup.on("backup:start", ({ backupId }) => console.log("starting", backupId));
backup.on("backup:success", ({ metadata }) => console.log("done", metadata.backupId));
backup.on("backup:error", ({ error }) => console.error(error));
backup.on("upload:success", ({ provider }) => console.log("uploaded to", provider));
backup.on("upload:error", ({ provider, error, required }) => console.error(provider, error, required));
backup.on("restore:start", ({ backupId }) => console.log("restoring", backupId));
backup.on("restore:success", ({ backupId, durationMs }) => console.log(backupId, durationMs));
backup.on("cleanup:complete", ({ deletedBackupIds }) => console.log("deleted", deletedBackupIds));
```

## Configuration Reference

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `mongodb.uri` | `string` | yes | MongoDB connection string |
| `mongodb.database` | `string` | yes | Database to back up |
| `mongodb.collections` | `string[]` | no | Limit backup to specific collections |
| `mongodb.timeoutMs` | `number` | no | `mongodump`/`mongorestore` timeout (default 30 min) |
| `storage` | `StorageConfig \| StorageConfig[]` | yes | One or more destination configs |
| `storage[].required` | `boolean` | no | Whether this destination must succeed (default `true`) |
| `schedule.enabled` | `boolean` | no | Enable the in-process scheduler |
| `schedule.cron` | `string` | if enabled | Cron expression |
| `schedule.timezone` | `string` | no | IANA timezone name |
| `retention.days` | `number \| "unlimited"` | no | Retention window per destination |
| `encryption.enabled` | `boolean` | no | Enable AES-256-GCM encryption |
| `encryption.key` | `string` | if enabled | 64-char hex key, or set `BACKUP_ENCRYPTION_KEY` |
| `compression.level` | `number` | no | Gzip level 0–9 |
| `metadataPath` | `string` | no | Path to the JSON metadata file |
| `tempDir` | `string` | no | Working directory for dump/restore artifacts |

## Error Handling

All errors extend `MongoBackupError` and carry a `code`:

```typescript
import { MongoBackupError, ChecksumMismatchError } from "@silent-hawk/mongo-backup-cloud";

try {
  await backup.restore({ backupId: "...", confirm: true });
} catch (error) {
  if (error instanceof ChecksumMismatchError) {
    // backup file corrupted in transit or at rest
  } else if (error instanceof MongoBackupError) {
    console.error(error.code, error.message);
  }
}
```

Available error classes: `ConfigError`, `MongoToolError`, `StorageProviderError`, `EncryptionError`, `ChecksumMismatchError`, `BackupNotFoundError`, `RestoreConfirmationRequiredError`.

## Security Recommendations

- See [Getting Credentials for Each Provider](#getting-credentials-for-each-provider) for how to obtain and scope each provider's keys correctly in the first place.
- Never commit credentials, encryption keys or `.env` files to source control.
- Store the encryption key in a secrets manager, not alongside backups or in the config file.
- Grant cloud storage credentials the minimum permissions needed (write + list + delete on a dedicated bucket/folder).
- Rotate access keys and Service Account keys periodically.
- `mongodump`/`mongorestore` are always invoked with argument arrays, never shell strings — do not alter this if contributing.

## Production Deployment

- Run the scheduler under PM2, Docker, Kubernetes or systemd so it survives process restarts (see Scheduling Configuration above).
- Mount the local metadata store (`metadataPath`) on persistent storage, or point it at network storage if running multiple replicas.
- Configure `retention` so backup storage costs don't grow unbounded.
- Monitor the `backup:error` and `upload:error` events and alert on them.
- For sharded clusters, `mongodump`/`mongorestore` run against the cluster are **not** point-in-time-consistent across shards unless you also pass cluster-level options supported by the underlying tools; plan your consistency requirements accordingly.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `mongodump: command not found` | Install the MongoDB Database Tools and ensure they're on `PATH` |
| `ChecksumMismatchError` on restore | Backup file corrupted in storage/transit, or wrong backup ID |
| `EncryptionError` on restore | Wrong or missing `BACKUP_ENCRYPTION_KEY` |
| Provider throws "requires the optional dependency" | Install that provider's SDK (see Installation above) |
| Backup marked `"partial"` | A non-required destination failed; check `upload:error` events |
| Backup marked `"failed"` | A **required** destination failed after 3 retries |

## Contribution Guidelines

1. Fork the repository and create a feature branch.
2. Run `npm install`, then `npm run typecheck && npm run lint && npm test` before opening a PR.
3. Add tests for new providers or core behavior; mock external SDKs in unit tests.
4. Keep new storage providers behind the `StorageProvider` interface and as optional dependencies.
5. Update this README and `CHANGELOG.md` for user-facing changes.

## Maintainers

[Silent Hawk LDA](https://shwk.eu)

## License

MIT — see [LICENSE](./LICENSE).
