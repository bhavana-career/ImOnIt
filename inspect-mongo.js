const { MongoClient } = require('mongodb');

async function checkMongo() {
  const uri = "mongodb+srv://2023isbhavanasa_db_user:i0UTuvdtWGRFGpPb@cluster0.q1ngldy.mongodb.net/CatchUp?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('final');

    const users = await db.collection('users').find({}).toArray();
    console.log("Users in DB:", users.length);
    
    // Group by email
    const emails = {};
    users.forEach(u => {
      if (!emails[u.email]) emails[u.email] = [];
      emails[u.email].push(u);
    });

    for (const [email, docs] of Object.entries(emails)) {
      if (docs.length > 1) {
        console.log(`Duplicate Email Found: ${email}`);
        docs.forEach(d => {
          console.log(` - ID: ${d._id}, Name: ${d.name}, Provider: ${d.provider}, AuthProvider: ${d.authProvider}`);
        });
      }
    }
    
    // Output specific documents for Padma or Bhavana if found
    console.log("\n--- Searching for Padma and Bhavana ---");
    const targets = users.filter(u => u.email.includes('padma') || u.email.includes('bhava') || u.name.toLowerCase().includes('padma') || u.name.toLowerCase().includes('bhavana'));
    targets.forEach(t => console.log(JSON.stringify(t, null, 2)));

    console.log("\n--- Checking Sessions ---");
    const sessions = await db.collection('sessions').find({}).toArray();
    console.log(`Found ${sessions.length} total sessions.`);
    
  } finally {
    await client.close();
  }
}

checkMongo().catch(console.error);
