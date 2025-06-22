// scheduler.js
const cron = require("node-cron");
const SimplifiExporter = require("./simplifi-export");

// Run every day at 6 AM
cron.schedule("0 6 * * *", async () => {
  console.log("Starting scheduled export...");
  const exporter = new SimplifiExporter();
  try {
    await exporter.run();
  } catch (error) {
    console.error("Scheduled export failed:", error);
    // Could send email notification here
  }
});
