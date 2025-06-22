// scheduler.js
const cron = require("node-cron");
const FinancialDataExporter = require("./financial-exporter");

// Run every day at 6 AM
cron.schedule("0 6 * * *", async () => {
  console.log("Starting scheduled export...");
  const exporter = new FinancialDataExporter();
  try {
    await exporter.run();
  } catch (error) {
    console.error("Scheduled export failed:", error);
    // Could send email notification here
  }
});
