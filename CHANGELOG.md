# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - Unreleased

### Changed

- Package renamed from `mongo-backup-cloud` to the scoped `@silent-hawk/mongo-backup-cloud` ahead of first publish. The CLI binary name (`mongo-backup-cloud`) and config filenames are unaffected.

### Added

- Initial release: core backup/restore engine built on `mongodump`/`mongorestore`.
- Storage providers: Local, Amazon S3, Cloudflare R2, Backblaze B2, Google Drive, Dropbox.
- Multi-destination uploads with required/optional destinations and independent retries.
- Gzip compression and AES-256-GCM encryption with SHA-256 checksum verification.
- Cron-based scheduler with timezone support and overlap prevention.
- Retention policies with per-provider configuration and latest-backup protection.
- JSON-based metadata store.
- Typed lifecycle event system.
- CLI: `init`, `backup`, `list`, `restore`, `cleanup`, `providers`, `config`.
