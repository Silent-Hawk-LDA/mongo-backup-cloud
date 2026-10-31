const { MongoBackup } = require("@silent-hawk/mongo-backup-cloud");

async function main() {
  const backup = new MongoBackup({
    mongodb: {
      uri: process.env.MONGODB_URI,
      database: "my_database"
    },
    storage: [
      { provider: "local", path: "./backups" },
      { provider: "s3", bucket: "mongodb-backups", region: "eu-west-1", required: false }
    ],
    retention: { days: 14 }
  });

  const { metadata } = await backup.backup();
  console.log("Backup finished:", metadata);

  const deleted = await backup.cleanup();
  console.log("Cleanup deleted:", deleted);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
