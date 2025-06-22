const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

class QuickenSimplifiExporter {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.downloadDir = "./exports";
    this.authStateFile = "./auth-state.json";
    this.baseUrl = "https://simplifi.quicken.com";
  }

  async initialize() {
    // Create exports directory if it doesn't exist
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }

    console.log("🚀 Initializing browser...");
    this.browser = await chromium.launch({
      headless: process.env.HEADLESS !== "false",
      slowMo: 50, // Slight delay for stability
    });

    // Check if we have saved authentication state
    const contextOptions = {
      acceptDownloads: true,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    if (fs.existsSync(this.authStateFile)) {
      console.log("🔑 Loading saved authentication state...");
      contextOptions.storageState = this.authStateFile;
    }

    this.context = await this.browser.newContext(contextOptions);

    this.page = await this.context.newPage();

    // Enhanced error handling - ignore analytics failures
    this.page.on("pageerror", (error) => {
      if (
        !error.message.includes("mixpanel") &&
        !error.message.includes("bugsnag") &&
        !error.message.includes("launchdarkly")
      ) {
        console.error("Page error:", error.message);
      }
    });

    this.page.on("requestfailed", (request) => {
      const url = request.url();
      // Only log failures for important requests, not analytics
      if (
        !url.includes("mixpanel") &&
        !url.includes("bugsnag") &&
        !url.includes("launchdarkly") &&
        !url.includes("pendo")
      ) {
        console.warn("Request failed:", url, request.failure()?.errorText);
      }
    });
  }

  async checkIfLoggedIn() {
    try {
      console.log("🔍 Checking if already logged in...");
      await this.page.goto(`${this.baseUrl}/transactions?displayNode=all`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Give the page a moment to render
      await this.page.waitForTimeout(3000);

      // Check if we see the auth iframe (means we need to login)
      const authIframeVisible = await this.page
        .locator('iframe[title="auth"]')
        .isVisible({ timeout: 3000 });

      if (authIframeVisible) {
        console.log("🔐 Authentication required (auth iframe detected)...");
        return false;
      }

      // If no auth iframe, check for main app content that indicates we're logged in
      const loggedInSelectors = [
        'button:has-text("Export")',
        'button[aria-label*="Export"]',
        ".transactions-table",
        ".account-summary",
        '[data-testid*="transaction"]',
        ".main-content",
        'nav[role="navigation"]',
        ".sidebar",
      ];

      for (const selector of loggedInSelectors) {
        try {
          if (await this.page.locator(selector).isVisible({ timeout: 2000 })) {
            console.log(`✅ Already logged in! Found: ${selector}`);
            return true;
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      // Additional check - look for any indication we're in the app
      const pageTitle = await this.page.title();
      const url = this.page.url();

      if (pageTitle.includes("Transactions") || url.includes("/transactions")) {
        console.log("✅ Already logged in! (detected from page title/URL)");
        return true;
      }

      console.log("❓ Login state unclear, will attempt authentication...");
      return false;
    } catch (error) {
      console.log(
        "🔐 Could not determine login state, will attempt authentication..."
      );
      return false;
    }
  }

  async login() {
    try {
      // First check if we're already logged in
      if (await this.checkIfLoggedIn()) {
        return; // Already logged in, skip authentication
      }

      console.log("📱 Starting authentication process...");

      // If we reach here, we need to authenticate
      console.log("🔐 Waiting for auth iframe...");
      // Wait for the auth iframe to load
      await this.page.waitForSelector('iframe[title="auth"]', {
        timeout: 15000,
      });

      const authFrame = this.page
        .locator('iframe[title="auth"]')
        .contentFrame();

      console.log("📧 Entering email...");
      await authFrame
        .getByRole("textbox", { name: "Quicken ID (email address)" })
        .click();
      await authFrame
        .getByRole("textbox", { name: "Quicken ID (email address)" })
        .fill(process.env.QUICKEN_USERNAME);

      await authFrame.getByRole("button", { name: "Continue" }).click();

      console.log("🔑 Entering password...");
      // Wait for password field to appear
      await authFrame
        .getByRole("textbox", { name: "Password, or click for a" })
        .waitFor({ timeout: 10000 });
      await authFrame
        .getByRole("textbox", { name: "Password, or click for a" })
        .fill(process.env.QUICKEN_PASSWORD);

      // Optional: Keep signed in
      if (process.env.KEEP_SIGNED_IN !== "false") {
        await authFrame
          .getByRole("checkbox", { name: "Keep me signed in" })
          .check();
      }

      await authFrame.getByRole("button", { name: "Sign in" }).click();

      // Handle potential MFA
      await this.handleMFA(authFrame);

      console.log("⏳ Waiting for login to complete...");
      // Wait for successful login - the auth iframe should disappear
      await this.page.waitForFunction(
        () => {
          const authIframe = document.querySelector('iframe[title="auth"]');
          if (!authIframe) return true;

          // Check if iframe is still visible/active
          return (
            authIframe.style.display === "none" ||
            authIframe.offsetHeight === 0 ||
            !authIframe.contentDocument
          );
        },
        { timeout: 180000 }
      ); // 3 minute timeout for MFA

      // Additional wait for page to fully load (but ignore analytics failures)
      try {
        await this.page.waitForLoadState("networkidle", { timeout: 15000 });
      } catch (e) {
        console.log(
          "⚠️ Page still loading (analytics timeouts), but continuing..."
        );
        // Continue anyway - analytics failures don't prevent functionality
      }

      console.log("✅ Login successful!");

      // Save authentication state for future use
      await this.saveAuthState();
    } catch (error) {
      await this.takeErrorScreenshot("login-error");
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async handleMFA(authFrame) {
    try {
      console.log("📱 Checking for MFA prompt...");

      // Wait a moment for MFA prompt to appear
      await this.page.waitForTimeout(3000);

      // Check for various MFA-related elements
      const mfaSelectors = [
        'input[placeholder*="code"]',
        'input[name*="code"]',
        'input[type="text"][maxlength="6"]',
        'input[placeholder*="verification"]',
        '[data-testid*="mfa"]',
        '[data-testid*="code"]',
      ];

      let mfaDetected = false;

      for (const selector of mfaSelectors) {
        try {
          const element = authFrame.locator(selector);
          if (await element.isVisible({ timeout: 5000 })) {
            mfaDetected = true;
            break;
          }
        } catch (e) {
          // Continue checking other selectors
        }
      }

      // Also check for MFA text on the page
      const mfaTexts = [
        "verification code",
        "enter code",
        "text message",
        "sms",
        "authenticate",
      ];
      for (const text of mfaTexts) {
        try {
          if (await authFrame.getByText(text, { timeout: 2000 }).isVisible()) {
            mfaDetected = true;
            break;
          }
        } catch (e) {
          // Continue checking
        }
      }

      if (mfaDetected) {
        console.log("🔐 MFA detected! Please complete the following steps:");
        console.log("   1. Check your phone for SMS code");
        console.log("   2. Enter the code in the browser window");
        console.log("   3. Click submit/continue in the browser");
        console.log("   4. Wait for the login to complete");
        console.log("");
        console.log(
          "⏳ Script will wait up to 3 minutes for you to complete MFA..."
        );
        console.log(
          "   (The browser window should be visible for you to interact with)"
        );

        // Don't pause automatically - just let the main timeout handle it
        // This way users can complete MFA naturally without extra pauses
      } else {
        console.log("✅ No MFA required, continuing...");
      }
    } catch (error) {
      console.log("📱 MFA check completed, continuing with login...");
    }
  }

  async saveAuthState() {
    try {
      await this.context.storageState({ path: this.authStateFile });
      console.log("💾 Authentication state saved for future use");
    } catch (error) {
      console.warn("⚠️ Could not save authentication state:", error.message);
    }
  }

  async clearAuthState() {
    try {
      if (fs.existsSync(this.authStateFile)) {
        fs.unlinkSync(this.authStateFile);
        console.log("🗑️ Cleared saved authentication state");
      }
    } catch (error) {
      console.warn("⚠️ Could not clear authentication state:", error.message);
    }
  }

  async handleDownload() {
    try {
      console.log("📥 Looking for CSV export button...");

      // Try to find the export button using the original selector from your codegen
      const exportButton = this.page.getByRole("button", {
        name: "Export to .CSV",
      });

      // Wait for the button to be available
      await exportButton.waitFor({ timeout: 15000 });

      console.log("📥 Starting CSV export...");

      // Set up download handling before clicking
      const downloadPromise = this.page.waitForEvent("download", {
        timeout: 30000,
      });

      // Click the export button
      await exportButton.click();

      console.log("⏳ Waiting for download to start...");
      const download = await downloadPromise;

      // Create filename with date and time
      const now = new Date();
      const dateStamp = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStamp = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS
      const filename = `quicken-transactions-${dateStamp}-${timeStamp}.csv`;
      const filepath = path.join(this.downloadDir, filename);

      await download.saveAs(filepath);

      console.log(`✅ Download completed: ${filename}`);
      return filepath;
    } catch (error) {
      // If the main button isn't found, let's debug what's available
      console.log("🔍 Export button not found, debugging available buttons...");

      try {
        const allButtons = await this.page.$eval("button", (buttons) =>
          buttons
            .map((btn) => ({
              text: btn.textContent?.trim(),
              name: btn.getAttribute("name"),
              id: btn.id,
              visible: btn.offsetHeight > 0,
            }))
            .filter((btn) => btn.visible)
        );

        console.log("Available buttons:", allButtons);

        // Look for any button containing "export" or "CSV"
        const exportButtons = allButtons.filter(
          (btn) =>
            btn.text?.toLowerCase().includes("export") ||
            btn.text?.toLowerCase().includes("csv")
        );

        if (exportButtons.length > 0) {
          console.log("Found potential export buttons:", exportButtons);
        }
      } catch (debugError) {
        console.log("Debug failed:", debugError.message);
      }

      await this.takeErrorScreenshot("download-error");
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  async takeErrorScreenshot(prefix) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const screenshotPath = `${prefix}-${timestamp}.png`;
      await this.page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      console.log(`📸 Error screenshot saved: ${screenshotPath}`);
    } catch (e) {
      console.error("Could not take screenshot:", e.message);
    }
  }

  async cleanup() {
    console.log("🧹 Cleaning up...");
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  async exportTransactions() {
    try {
      await this.initialize();
      await this.login();
      const downloadPath = await this.handleDownload();

      console.log("🎉 Export completed successfully!");
      console.log(`📁 File saved to: ${downloadPath}`);

      return downloadPath;
    } catch (error) {
      console.error("❌ Export failed:", error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Method to clear saved authentication (useful if login issues occur)
  static async clearAuth() {
    const authFile = "./auth-state.json";
    if (fs.existsSync(authFile)) {
      fs.unlinkSync(authFile);
      console.log("🗑️ Cleared saved authentication state");
    } else {
      console.log("ℹ️ No saved authentication state found");
    }
  }

  // Optional: Add date range filtering
  async exportTransactionsWithDateRange(startDate, endDate) {
    try {
      await this.initialize();
      await this.login();

      console.log(`📅 Setting date range: ${startDate} to ${endDate}`);

      // Look for date range controls (you may need to adjust selectors)
      const dateRangeSelector = this.page
        .locator('[data-testid="date-range"], .date-picker, .date-filter')
        .first();

      if (await dateRangeSelector.isVisible({ timeout: 5000 })) {
        await dateRangeSelector.click();

        // Set custom date range (selectors may vary)
        await this.page.fill('input[type="date"]:first-of-type', startDate);
        await this.page.fill('input[type="date"]:last-of-type', endDate);

        // Apply filter
        await this.page.getByRole("button", { name: "Apply" }).click();
        await this.page.waitForLoadState("networkidle");
      }

      const downloadPath = await this.handleDownload();

      console.log("🎉 Filtered export completed successfully!");
      return downloadPath;
    } catch (error) {
      console.error("❌ Filtered export failed:", error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI usage
async function main() {
  const exporter = new QuickenSimplifiExporter();

  // Check for special commands
  const args = process.argv.slice(2);

  if (args.includes("--clear-auth")) {
    await QuickenSimplifiExporter.clearAuth();
    return;
  }

  try {
    // Check for date range arguments
    if (args.length === 2 && !args[0].startsWith("--")) {
      const [startDate, endDate] = args;
      await exporter.exportTransactionsWithDateRange(startDate, endDate);
    } else {
      await exporter.exportTransactions();
    }
  } catch (error) {
    console.error("Process failed:", error.message);

    // If login failed, suggest clearing auth state
    if (
      error.message.includes("Login failed") ||
      error.message.includes("authentication")
    ) {
      console.log(
        "\n💡 Tip: If you keep having login issues, try clearing saved authentication:"
      );
      console.log("   node quicken-exporter.js --clear-auth");
    }

    process.exit(1);
  }
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("\n🛑 Received interrupt signal, cleaning up...");
  process.exit(0);
});

// Export for use as module
module.exports = QuickenSimplifiExporter;

// Run if called directly
if (require.main === module) {
  main();
}

// This file is deprecated. Please use simplifi-export.js for all export operations.
