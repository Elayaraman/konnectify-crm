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
  console.log("=== TEST 9: State consistency (count) ===");
  let r1 = await sendChat("how many tickets does airbus have");
  console.log("Count 1:", J(r1.data?.result ?? r1));
  let r2 = await sendChat("create a ticket for airbus about network latency");
  console.log("Create:", J(r2.data?.result ?? r2));
  let r3 = await sendChat("how many tickets does airbus have");
  console.log("Count 2:", J(r3.data?.result ?? r3));

  console.log("\n=== TEST 10: Unassigned contact ===");
  let r4 = await sendChat("create a contact named Alex with no company");
  console.log("Create Alex:", J(r4.data?.result ?? r4));
  let r5 = await sendChat("list all contacts");
  let contacts = r5.data?.result?.contacts ?? [];
  let alex = contacts.find(c => c.name && c.name.toLowerCase().includes('alex'));
  console.log("Alex in list:", alex ? "YES" : "NO", "Total contacts:", contacts.length);

  console.log("\n=== TEST 11: Fallback - update contact, confirm ===");
  let history11 = [];
  let r6 = await sendChat("update contact 3's company to acme", history11);
  console.log("Step 1:", J(r6.data?.result ?? r6));
  if (r6.data?.result?.type === 'clarify') {
    history11.push({ role: "user", text: "update contact 3's company to acme" });
    history11.push({ role: "assistant", text: r6.data.result.question });
    let r7 = await sendChat("yes", history11);
    console.log("Step 2 (yes):", J(r7.data?.result ?? r7));
  }

  console.log("\n=== TEST 12: Fallback - create ticket, confirm ===");
  let history12 = [];
  let r8 = await sendChat("create a ticket for nonexistentcorp about a server outage", history12);
  console.log("Step 1:", J(r8.data?.result ?? r8));
  if (r8.data?.result?.type === 'clarify') {
    history12.push({ role: "user", text: "create a ticket for nonexistentcorp about a server outage" });
    history12.push({ role: "assistant", text: r8.data.result.question });
    let r9 = await sendChat("yes", history12);
    console.log("Step 2 (yes):", J(r9.data?.result ?? r9));
  }

  console.log("\n=== TEST 13: Fallback - decline ===");
  let history13 = [];
  let r10 = await sendChat("update contact 4's company to fakecorp", history13);
  console.log("Step 1:", J(r10.data?.result ?? r10));
  if (r10.data?.result?.type === 'clarify') {
    history13.push({ role: "user", text: "update contact 4's company to fakecorp" });
    history13.push({ role: "assistant", text: r10.data.result.question });
    let r11 = await sendChat("no", history13);
    console.log("Step 2 (no):", J(r11.data?.result ?? r11));
  }
}

run().catch(console.error);
