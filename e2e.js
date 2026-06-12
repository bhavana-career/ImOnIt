const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting e2e test...");
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const context = browser.defaultBrowserContext();
  
  // Login A
  const pageLoginA = await context.newPage();
  await pageLoginA.goto('http://localhost:3000/api/auth/test-login?account=A');
  const resA = await pageLoginA.evaluate(() => JSON.parse(document.body.innerText));
  const userA_id = resA.userId;
  await pageLoginA.close();

  // Login B
  const pageLoginB = await context.newPage();
  await pageLoginB.goto('http://localhost:3000/api/auth/test-login?account=B');
  const resB = await pageLoginB.evaluate(() => JSON.parse(document.body.innerText));
  const userB_id = resB.userId;
  await pageLoginB.close();

  console.log("Users created:", { userA_id, userB_id });

  const pageA = await context.newPage();
  const pageB = await context.newPage();

  // Set up interception
  let pageA_requests = [];
  let pageB_requests = [];

  pageA.on('request', request => {
    if (request.url().includes('/api/')) {
      pageA_requests.push({
        url: request.url(),
        activeAccountHeader: request.headers()['x-active-account']
      });
    }
  });

  pageB.on('request', request => {
    if (request.url().includes('/api/')) {
      pageB_requests.push({
        url: request.url(),
        activeAccountHeader: request.headers()['x-active-account']
      });
    }
  });

  console.log("Opening tabs...");
  // Tab A
  await pageA.goto(`http://localhost:3000/dashboard?account=${userA_id}`);
  await pageA.waitForSelector('header'); // Wait for some load

  // Tab B
  await pageB.goto(`http://localhost:3000/dashboard?account=${userB_id}`);
  await pageB.waitForSelector('header'); // Wait for some load

  // Wait a moment for async requests like /api/hubs to fire
  await new Promise(r => setTimeout(r, 2000));

  // Assertions
  console.log("--- Page A API Requests ---");
  let failed = false;
  pageA_requests.forEach(req => {
    console.log(`URL: ${req.url} | Header x-active-account: ${req.activeAccountHeader}`);
    if (req.activeAccountHeader !== userA_id) {
      console.error(`FAIL! Expected ${userA_id} but got ${req.activeAccountHeader}`);
      failed = true;
    }
  });

  console.log("--- Page B API Requests ---");
  pageB_requests.forEach(req => {
    console.log(`URL: ${req.url} | Header x-active-account: ${req.activeAccountHeader}`);
    if (req.activeAccountHeader !== userB_id) {
      console.error(`FAIL! Expected ${userB_id} but got ${req.activeAccountHeader}`);
      failed = true;
    }
  });

  if (failed) {
    console.error("E2E Test Failed due to header mismatch!");
    process.exit(1);
  } else {
    console.log("E2E Test Passed! Isolation confirmed.");
  }

  await browser.close();
})();
