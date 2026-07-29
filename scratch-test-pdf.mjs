import { chromium } from 'playwright';
import path from 'path';

const BASE = 'https://practica-aims.vercel.app';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));

await page.goto(`${BASE}/enter/student`, { waitUntil: 'networkidle' });
await page.fill('input[name="studentId"]', '333');
await page.click('button[type="submit"]');
await page.waitForURL('**/submit', { timeout: 20000 });
await page.screenshot({ path: 'scratch-pdf-before.png' });

await page.click('text=Upload a file instead');
const fileInput = page.locator('input[type="file"]:not([capture])');
await fileInput.setInputFiles(path.resolve('scratch-test.pdf'));

console.log('uploaded PDF, waiting for pipeline...');
try {
  await page.waitForSelector('text=/skew:|error|ILLEGIBLE/i', { timeout: 150000 });
} catch (e) {
  console.log('timeout waiting for result:', e.message);
}
await page.waitForTimeout(2000);
await page.screenshot({ path: 'scratch-pdf-result.png', fullPage: true });
console.log('console errors:', logs);
console.log('final url:', page.url());
console.log('done');
await browser.close();
