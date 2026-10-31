# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-10-31

### Added

- Storage providers: DigitalOcean Spaces (S3-compatible), Google Cloud Storage, Azure Blob Storage (connection string or account name/key).
- Documented using the `s3` provider directly against other S3-compatible services (MinIO, Wasabi, Linode/Akamai Object Storage, Oracle Cloud Object Storage, etc.).

### Fixed

- `dropbox` optional dependency pinned to `10.34.0`; newer releases require Node `>=22` and were silently skipped by `npm ci` on Node 20, breaking typecheck/build.
- `@azure/storage-blob`'s own transitive dependencies pinned via npm `overrides` (`core-rest-pipeline`, `core-util`, `core-client`, `core-xml`, `logger`, `core-tracing`, `core-paging`, `core-http-compat`, `core-auth`, `abort-controller`, `storage-common`, `@typespec/ts-http-runtime`) — several had independently bumped to require Node `>=22`, which caused npm to silently skip installing the whole package on Node 20.
- Dropped a leading `./` from the `bin` path to avoid a misleading npm publish-time normalization warning (the entry was never actually broken).
- README badges and title updated to the scoped package name so they resolve correctly.

## [0.1.0] - 2026-10-31

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
