import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  const baseUrl = 'http://localhost:3000';
  
  const screenshots = [
    { url: '/reports', name: '01-reports-hub-mobile' },
    { url: '/reports/outstanding', name: '02-outstanding-mobile' },
    { url: '/reports/cash-book', name: '03-cash-book-mobile' },
    { url: '/reports/customer-statement', name: '04-customer-statement-mobile' },
    { url: '/customers', name: '05-customers-list-mobile' },
    { url: '/customers/c-1', name: '06-customer-detail-mobile' },
    { url: '/vendors/v-1', name: '07-vendor-detail-mobile' },
  ];

  console.log('Capturing proposed mobile screenshots (390x844)...');
  for (const shot of screenshots) {
    try {
      await page.goto(baseUrl + shot.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: `/opt/cursor/artifacts/proposed/${shot.name}.png`,
        fullPage: true
      });
      console.log(`✓ ${shot.name}.png`);
    } catch (e) {
      console.log(`✗ ${shot.name}.png - ${e.message}`);
    }
  }

  // Desktop Reports hub
  await context.close();
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const desktopPage = await desktopContext.newPage();
  
  await desktopPage.goto(baseUrl + '/reports', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.screenshot({ 
    path: '/opt/cursor/artifacts/proposed/01-reports-hub-desktop.png'
  });
  console.log('✓ 01-reports-hub-desktop.png');

  await browser.close();
  console.log('Done capturing proposed state!');
}

captureScreenshots().catch(console.error);
