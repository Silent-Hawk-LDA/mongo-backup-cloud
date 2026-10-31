# Claude Code Development Prompt: Build a Multi-Cloud MongoDB Backup NPM Package

Act as a Senior Node.js Architect, TypeScript Engineer, DevOps Engineer, and Open-Source Package Maintainer.

Build a production-ready, open-source npm package named `mongo-backup-cloud`.

The package should provide an easy, reliable, and extensible way to automatically back up MongoDB databases and store backups across multiple cloud storage providers.

This must be a reusable npm package, not a standalone application.

---

# 1. Product Vision

Develop a universal MongoDB backup package that allows developers to:

- Back up MongoDB databases automatically.
- Upload backups to different cloud storage providers.
- Schedule backups using cron expressions.
- Configure backup retention policies.
- Restore databases from cloud backups.
- Encrypt backups before uploading.
- Verify backup integrity.
- Manage multiple databases.
- Switch between storage providers without changing the backup engine.

The package must support JavaScript and TypeScript projects.

The primary objective is to make MongoDB backup management extremely simple for developers.

# 2. Supported Storage Providers

Implement a provider-based architecture.

Initial storage providers:

### Google Drive
- Google Service Account authentication.
- Custom Drive folder ID.
- Resumable uploads.
- File listing.
- File deletion.
- File downloading.
- Metadata retrieval.

### Amazon S3
- AWS SDK v3.
- IAM role authentication.
- Access key and secret key authentication.
- Custom bucket and region.
- Multipart uploads.
- Object listing.
- Object deletion.
- Object downloading.
- S3-compatible endpoints.

### Cloudflare R2
- S3-compatible API.
- Account endpoint configuration.
- Access key authentication.
- Bucket management.

### Backblaze B2
- S3-compatible API integration.
- Bucket configuration.
- Upload and download.
- File management.

### Dropbox
- OAuth 2.0 or supported access-token authentication.
- Configurable destination folder.
- File uploads and downloads.
- File listing and deletion.

### Local Storage
- Store backups in a local directory.
- Configurable directory.
- Retention management.
- Restore support.

Design the architecture so additional storage providers can be added without modifying the core backup engine.

Do not implement fake or placeholder providers. Implement working providers or clearly mark future providers as unsupported.

# 3. TypeScript-First Architecture

Use TypeScript as the primary development language.

Requirements:

- Strict TypeScript mode.
- Full type definitions.
- Generic provider interfaces.
- Strongly typed configuration.
- Typed event callbacks.
- Typed error classes.
- ESM support.
- CommonJS compatibility.
- TypeScript declaration generation.
- Tree-shakeable exports where practical.

The package must work with:

- Node.js 20+
- TypeScript 5+
- Modern JavaScript applications.
- Express applications.
- NestJS applications.
- Next.js backend environments.

Avoid browser-specific dependencies.

# 4. Developer Experience

Installation:

```bash
npm install mongo-backup-cloud
```

Basic usage:

```typescript
import { MongoBackup } from "mongo-backup-cloud";

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

Manual backup:

```typescript
const result = await backup.backup();

console.log(result);
```

List backups:

```typescript
const backups = await backup.list();
```

Restore:

```typescript
await backup.restore({
  backupId: "BACKUP_ID"
});
```

Stop scheduler:

```typescript
await backup.stop();
```

Ensure all APIs are implemented and correctly typed.

# 5. Storage Provider Configuration

Support an intuitive provider configuration interface.

Google Drive:

```typescript
storage: {
  provider: "google-drive",
  credentials: "./service-account.json",
  folderId: "FOLDER_ID"
}
```

Amazon S3:

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

Cloudflare R2:

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

Local storage:

```typescript
storage: {
  provider: "local",
  path: "./mongodb-backups"
}
```

Dropbox:

```typescript
storage: {
  provider: "dropbox",
  accessToken: process.env.DROPBOX_ACCESS_TOKEN,
  folder: "/mongodb-backups"
}
```

Use discriminated TypeScript unions so invalid provider configurations are rejected at compile time.

# 6. Multiple Storage Destinations

This is an important feature.

Allow developers to upload the same backup to multiple destinations.

Example:

```typescript
storage: [
  {
    provider: "google-drive",
    credentials: "./credentials.json",
    folderId: "DRIVE_FOLDER_ID"
  },
  {
    provider: "s3",
    bucket: "mongodb-backups",
    region: "eu-west-1"
  },
  {
    provider: "local",
    path: "./backups"
  }
]
```

Requirements:

- Support multiple storage providers simultaneously.
- Upload to destinations concurrently where safe.
- Track individual upload status.
- Retry failed destinations independently.
- Never mark the entire backup as successful if required destinations failed.
- Allow developers to mark destinations as required or optional.
- Prevent duplicate uploads during retry.
- Provide clear reporting of successful and failed destinations.

# 7. MongoDB Backup Engine

Use official MongoDB Database Tools:

- mongodump
- mongorestore

Requirements:

- Full database backup.
- Selected database backup.
- Collection filtering.
- BSON archive format.
- Gzip compression.
- Timestamped filenames.
- SHA-256 checksums.
- Backup verification.
- Replica set support.
- Authentication support.
- Connection timeout handling.
- Child-process management.

Use streaming to minimize memory consumption.

Never build shell commands from untrusted input.

Use secure child-process spawning with argument arrays.

Document compatibility and consistency limitations for sharded clusters.

# 8. Compression and Encryption

Support:

- Gzip compression.
- Configurable compression level.
- Optional encryption using AES-256-GCM.
- Secure encryption key management.
- Unique initialization vector per backup.
- Authentication tag verification.
- Checksum verification before restoration.

The encryption key must never be stored alongside the encrypted backup.

Do not log sensitive credentials or encryption keys.

# 9. Scheduling

Implement an optional scheduling engine.

Use node-cron or a suitable scheduling abstraction.

Features:

- Cron expressions.
- Timezone support.
- Daily backups.
- Weekly backups.
- Custom schedules.
- Manual execution.
- Prevent overlapping jobs.
- Graceful shutdown.
- Backup lifecycle events.

Default schedule:

```typescript
cron: "0 2 * * *"
timezone: "Europe/Lisbon"
```

Clearly document that in-process scheduling requires the host process to remain running.

Provide guidance for PM2, Docker and systemd deployments.

# 10. Retention Management

Implement:

- Configurable retention periods.
- 7, 30, 60, 90 days.
- Custom retention periods.
- Unlimited retention.
- Independent retention for each storage provider.
- Automatic cleanup.
- Manual cleanup.
- Protection of the latest successful backup.
- Metadata tracking for deleted backups.

Never delete files that do not belong to this package.

# 11. Restore Engine

Provide a reliable restore mechanism.

Features:

- List backups.
- Download backup from any supported provider.
- Verify checksum.
- Decrypt if necessary.
- Decompress archive.
- Restore using mongorestore.
- Restore to a different database.
- Namespace mapping.
- Selective collection restoration where supported.
- Explicit confirmation before destructive restoration.
- Temporary file cleanup.

Support restoring from one storage provider even if the original backup was replicated to multiple destinations.

# 12. Backup Metadata

Track:

- Backup ID.
- Database name.
- Creation timestamp.
- Original size.
- Compressed size.
- Checksum.
- Encryption status.
- Duration.
- Backup status.
- Storage provider.
- Remote storage file ID.
- Upload status per destination.

Metadata should be provider-independent.

Provide an abstraction for metadata storage. Support a local JSON-based implementation initially, with an interface that can support database-backed implementations later.

Handle interrupted executions and incomplete metadata records safely.

# 13. Event System

Expose typed lifecycle events:

```typescript
backup.on("backup:start", callback);
backup.on("backup:success", callback);
backup.on("backup:error", callback);
backup.on("upload:success", callback);
backup.on("upload:error", callback);
backup.on("restore:start", callback);
backup.on("restore:success", callback);
backup.on("cleanup:complete", callback);
```

Provide appropriate event payload types.

# 14. CLI

Provide a CLI command:

```bash
mongo-backup-cloud
```

Commands:

```bash
mongo-backup-cloud init
mongo-backup-cloud backup
mongo-backup-cloud list
mongo-backup-cloud restore
mongo-backup-cloud cleanup
mongo-backup-cloud providers
mongo-backup-cloud config
```

Support:

- Configuration files.
- Environment variables.
- CLI arguments.
- Interactive setup.
- Provider validation.

The CLI should be independently usable without requiring developers to write JavaScript.

# 15. NestJS and Express Integration

Provide integration examples for:

- Express applications.
- NestJS applications.
- Generic Node.js applications.
- TypeScript projects.
- JavaScript projects.

Do not make NestJS or Express mandatory dependencies.

# 16. Project Architecture

Use a clean modular structure:

```text
mongo-backup-cloud/
├── src/
│   ├── core/
│   │   ├── backup-engine.ts
│   │   ├── restore-engine.ts
│   │   ├── scheduler.ts
│   │   └── backup-manager.ts
│   ├── providers/
│   │   ├── interfaces/
│   │   │   └── storage-provider.ts
│   │   ├── google-drive/
│   │   ├── s3/
│   │   ├── cloudflare-r2/
│   │   ├── backblaze/
│   │   ├── dropbox/
│   │   └── local/
│   ├── compression/
│   ├── encryption/
│   ├── metadata/
│   ├── retention/
│   ├── events/
│   ├── cli/
│   ├── config/
│   ├── errors/
│   ├── utils/
│   └── index.ts
├── examples/
├── tests/
├── docs/
├── .github/
│   └── workflows/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── CHANGELOG.md
└── .gitignore
```

You may improve the structure where necessary.

# 17. Testing

Use Vitest or Jest.

Test:

- MongoDB dump.
- MongoDB restore.
- Compression.
- Encryption.
- Checksums.
- Every implemented storage provider.
- Multiple destination uploads.
- Independent upload retries.
- Retention.
- Scheduler.
- Metadata.
- Event callbacks.
- Configuration validation.
- Interrupted uploads.
- Process shutdown.
- TypeScript type compatibility.

Provide unit tests and integration tests.

Mock external services for unit tests.

# 18. NPM Package Publishing

Prepare the package for public npm publication.

Include:

- Proper package.json exports.
- ESM and CommonJS entry points.
- TypeScript declaration files.
- Semantic versioning.
- ESLint.
- Prettier.
- GitHub Actions CI.
- README.
- CHANGELOG.
- LICENSE.
- .npmignore.
- Package size optimization.
- npm pack dry-run validation.

Keep cloud provider SDKs optional where practical. Use optional dependencies or separate provider subpath exports so users only install the integrations they need.

Avoid requiring AWS SDK, Google APIs and Dropbox dependencies for users who only use local storage.

Do not bundle credentials, test backups or secrets in the published package.

# 19. README.md Requirements

Create a professional README.md suitable for a public GitHub repository and npm package.

The README must contain:

1. Project title and description.
2. Badges for npm version, downloads, license and build status, using valid badge URLs.
3. Key features.
4. Supported storage providers.
5. Installation.
6. Requirements and prerequisites.
7. Quick start.
8. TypeScript example.
9. JavaScript example.
10. Google Drive configuration.
11. Amazon S3 configuration.
12. Cloudflare R2 configuration.
13. Backblaze B2 configuration.
14. Dropbox configuration.
15. Local storage configuration.
16. Multiple storage destination example.
17. Scheduling configuration.
18. Retention configuration.
19. Compression and encryption.
20. Manual backup.
21. Listing backups.
22. Restore instructions.
23. CLI documentation.
24. Express integration.
25. NestJS integration.
26. Event handling.
27. Configuration reference table.
28. Error handling.
29. Security recommendations.
30. Production deployment.
31. Troubleshooting.
32. Contribution guidelines.
33. License.

Do not document functionality that has not actually been implemented.

Use concise, professional language and realistic code examples.

# 20. Development Workflow

Before coding:

1. Inspect the repository.
2. Check the current Node.js and TypeScript versions.
3. Design the core provider interface.
4. Explain the architecture.
5. Implement the core backup engine first.
6. Implement local storage as the reference provider.
7. Implement Google Drive and Amazon S3 next.
8. Implement the remaining providers using the same interface.
9. Add multi-destination support.
10. Implement restore, retention, encryption and scheduling.
11. Add tests and documentation.
12. Verify npm packaging.

Do not implement fake functionality or placeholder methods.

If a provider cannot be completed, document it as planned rather than pretending it works.

Run tests, linting, type checking, and npm package validation.

Fix all discovered errors.

The final deliverable must be a working, maintainable, TypeScript-first npm package that developers can install and use in real production projects.

Prioritize reliability, security, data integrity, extensibility, low memory consumption and developer experience.