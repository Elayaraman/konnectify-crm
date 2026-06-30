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
  console.log("=== TEST 1: Cross-entity creation ===");
  let r1 = await sendChat("create a contact priya from rapido");
  console.log("Create Priya:", J(r1.data?.result ?? r1));
  let r2 = await sendChat("create a ticket for priya about a billing issue");
  console.log("Create ticket for Priya:", J(r2.data?.result ?? r2));

  console.log("\n=== TEST 2: Ambiguous contact resolution ===");
  let r2b = await sendChat("create a contact priya from airbus");
  console.log("Create 2nd Priya:", J(r2b.data?.result ?? r2b));
  let r3 = await sendChat("create a ticket for the contact named priya about login issues");
  console.log("Ticket for ambiguous Priya:", J(r3.data?.result ?? r3));

  console.log("\n=== TEST 3: Cascade delete company ===");
  let r4 = await sendChat("delete company rapido");
  console.log("Delete Rapido:", J(r4.data?.result ?? r4));
  let r5 = await sendChat("list all tickets");
  let tickets = r5.data?.result?.tickets ?? [];
  let rapTickets = tickets.filter(t => t.company_name === 'Rapido' || t.company_id === 1);
  console.log("Rapido tickets remaining:", rapTickets.length, "of", tickets.length, "total");
  let r6 = await sendChat("list all contacts");
  let contacts = r6.data?.result?.contacts ?? [];
  console.log("Total contacts remaining:", contacts.length);

  console.log("\n=== TEST 4: Delete contact linked to ticket ===");
  // After cascade delete of rapido, contact IDs shifted. Let's pick contact 3
  let r7 = await sendChat("delete contact 3");
  console.log("Delete contact 3:", J(r7.data?.result ?? r7));
  let r8 = await sendChat("list all tickets");
  console.log("Tickets remaining after contact delete:", (r8.data?.result?.tickets ?? []).length);
}

run().catch(console.error);
