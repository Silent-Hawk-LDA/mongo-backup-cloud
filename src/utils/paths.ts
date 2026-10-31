import { randomUUID } from "node:crypto";

export function timestampForFilename(date: Date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function generateBackupId(database: string, date: Date = new Date()): string {
  return `${database}-${timestampForFilename(date)}-${randomUUID().slice(0, 8)}`;
}

export function archiveFileName(backupId: string, extension = "archive.gz"): string {
  return `${backupId}.${extension}`;
}
