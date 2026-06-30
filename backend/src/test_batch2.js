const http = require('http');

async function sendChat(message, history = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, history });
    const req = http.request(
      'http://127.0.0.1:4000/api/copilot',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve({raw: body}); } });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function J(o) { return JSON.stringify(o, null, 2); }

async function run() {
  // Baseline check: list all tickets
  console.log("=== BASELINE ===");
  let bl = await sendChat("list all tickets");
  console.log("Baseline tickets raw type:", bl.data?.result?.type, "count:", bl.data?.result?.tickets?.length);
  if (bl.data?.result?.type !== 'list') console.log("FULL:", J(bl));

  console.log("\n=== TEST 5: Compound update ===");
  let r5 = await sendChat("move ticket 2 to airbus and reassign it to a contact there");
  console.log("Compound update:", J(r5.data?.result ?? r5));

  console.log("\n=== TEST 6: Update contact company ===");
  let r6 = await sendChat("update contact 2's company to hotstar");
  console.log("Update contact:", J(r6.data?.result ?? r6));

  console.log("\n=== TEST 7: Conflicting references ===");
  let r7 = await sendChat("create a ticket for hotstar, assign it to a contact from airbus");
  console.log("Conflicting:", J(r7.data?.result ?? r7));

  console.log("\n=== TEST 8: Ambiguous delete ===");
  let r8 = await sendChat("delete the ticket for hotstar");
  console.log("Ambiguous delete:", J(r8.data?.result ?? r8));
}

run().catch(console.error);
