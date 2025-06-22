const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://simplifi.quicken.com/transactions?displayNode=all');
  await page.locator('iframe[title="auth"]').contentFrame().getByRole('textbox', { name: 'Quicken ID (email address)' }).click();
  await page.locator('iframe[title="auth"]').contentFrame().getByRole('textbox', { name: 'Quicken ID (email address)' }).fill('mlockwitz@gmail.com');
  await page.locator('iframe[title="auth"]').contentFrame().getByRole('button', { name: 'Continue' }).click();
  await page.locator('iframe[title="auth"]').contentFrame().getByRole('textbox', { name: 'Password, or click for a' }).fill('7RsntHB8I1!+}Hg)y1]U');
  await page.locator('iframe[title="auth"]').contentFrame().getByRole('checkbox', { name: 'Keep me signed in' }).check();
  await page.locator('iframe[title="auth"]').contentFrame().getByRole('button', { name: 'Sign in' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export to .CSV' }).click();
  const download = await downloadPromise;
  await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();