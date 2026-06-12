const http = require('http');

async function testMe() {
  const baseURL = 'http://localhost:3000';
  
  // Padma's real ID
  const padmaId = "6a2bd5114be3f03382f0db17";
  const fakeOldPadmaId = "6a2bd5114be3f03382f0db18"; // Notice the 8 at the end
  
  // Create a user_accounts cookie with both the REAL padma and a FAKE stale padma
  const fakeAccounts = [
    { id: fakeOldPadmaId, email: "padmaaaashivakumar@gmail.com", name: "Padma Shivakumar" },
    { id: padmaId, email: "padmaaaashivakumar@gmail.com", name: "Padma Shivakumar" },
    { id: "6a2b9bb4081198a633ed5df3", email: "bhavanasbhavanas989@gmail.com", name: "Bhavana Shivakumar" }
  ];
  
  const encodedCookie = `user_accounts=${JSON.stringify(fakeAccounts)}`;
  
  console.log("Fetching /api/auth/me before fix...");
  const meRes = await fetch(`${baseURL}/api/auth/me?account=${padmaId}`, {
    headers: {
      "x-active-account": padmaId,
      "Cookie": encodedCookie
    }
  });
  
  const meData = await meRes.json();
  console.log("BEFORE FIX Accounts Array Length:", meData.accounts ? meData.accounts.length : 0);
  console.log("BEFORE FIX Accounts:", JSON.stringify(meData.accounts, null, 2));
}

testMe().catch(console.error);
