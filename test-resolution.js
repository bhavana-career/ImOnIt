const http = require('http');

async function testResolution() {
  const baseURL = 'http://localhost:3000';
  
  const padmaId = "6a2bd5114be3f03382f0db17";
  const bhavanaId = "6a2b9bb4081198a633ed5df3";
  
  // We need valid session cookies to pass authentication.
  // We can bypass this by manually querying the DB to grab existing sessions, 
  // or hitting the test-login endpoint I created earlier!
  
  console.log("Simulating Account Switcher Click to Padma...");
  const meRes = await fetch(`${baseURL}/api/auth/me?account=${padmaId}`, {
    headers: {
      "x-active-account": padmaId
    }
  });
  
  console.log("Simulating Account Switcher Click to Bhavana...");
  const meRes2 = await fetch(`${baseURL}/api/auth/me?account=${bhavanaId}`, {
    headers: {
      "x-active-account": bhavanaId
    }
  });

  console.log("Check the Next.js server console for 'Account Resolution Log'!");
}

testResolution().catch(console.error);
