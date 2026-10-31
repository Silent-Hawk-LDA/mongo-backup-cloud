import express from "express";
import { MongoBackup } from "@silent-hawk/mongo-backup-cloud";

const app = express();

const backup = new MongoBackup({
  mongodb: {
    uri: process.env.MONGODB_URI!,
    database: "my_database"
  },
  storage: {
    provider: "local",
    path: "./backups"
  },
  schedule: {
    enabled: true,
    cron: "0 2 * * *",
    timezone: "Europe/Lisbon"
  },
  retention: { days: 30 }
});

backup.on("backup:success", ({ metadata }) => {
  console.log(`Backup ${metadata.backupId} completed (${metadata.status}).`);
});

app.post("/admin/backups", async (_req, res) => {
  const result = await backup.backup();
  res.json(result.metadata);
});

app.get("/admin/backups", async (_req, res) => {
  res.json(await backup.list());
});

const port = process.env.PORT ?? 3000;
app.listen(port, async () => {
  await backup.start();
  console.log(`Listening on port ${port}`);
});
