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
  // TEST 3 retry: delete by name
  console.log("=== TEST 3 RETRY: Delete company by name ===");
  let r3 = await sendChat("delete company rapido");
  console.log("Delete Rapido:", J(r3.data?.result ?? r3));

  // TEST 5 retry: compound update
  console.log("\n=== TEST 5 RETRY: Compound update ===");
  let r5 = await sendChat("move ticket 5 to hotstar and reassign it to rohan");
  console.log("Compound:", J(r5.data?.result ?? r5));

  // TEST 10 retry: list all contacts (fresh DB)
  console.log("\n=== TEST 10 RETRY: List contacts ===");
  let r10 = await sendChat("list all contacts");
  let contacts = r10.data?.result?.contacts ?? [];
  console.log("Total contacts:", contacts.length, "Type:", r10.data?.result?.type ?? "error");
  if (r10.data?.result?.type !== 'list') console.log("FULL:", J(r10));

  // TEST 11 retry: offer-to-create fallback (update contact)
  console.log("\n=== TEST 11 RETRY: Fallback update contact ===");
  let h11 = [];
  let r11a = await sendChat("update contact 3's company to acme", h11);
  console.log("Step 1:", J(r11a.data?.result ?? r11a));
  if (r11a.data?.result?.type === 'clarify' && r11a.data.result.question.includes('PENDING_INTENT')) {
    h11.push({ role: "user", text: "update contact 3's company to acme" });
    h11.push({ role: "assistant", text: r11a.data.result.question });
    let r11b = await sendChat("yes", h11);
    console.log("Step 2 (yes):", J(r11b.data?.result ?? r11b));
  }

  // TEST 12 retry: offer-to-create fallback (create ticket)
  console.log("\n=== TEST 12 RETRY: Fallback create ticket ===");
  let h12 = [];
  let r12a = await sendChat("create a ticket for nonexistentcorp about a server outage", h12);
  console.log("Step 1:", J(r12a.data?.result ?? r12a));
  if (r12a.data?.result?.type === 'clarify' && r12a.data.result.question.includes('PENDING_INTENT')) {
    h12.push({ role: "user", text: "create a ticket for nonexistentcorp about a server outage" });
    h12.push({ role: "assistant", text: r12a.data.result.question });
    let r12b = await sendChat("yes", h12);
    console.log("Step 2 (yes):", J(r12b.data?.result ?? r12b));
  }

  // TEST 13 retry: fallback decline
  console.log("\n=== TEST 13 RETRY: Fallback decline ===");
  let h13 = [];
  let r13a = await sendChat("update contact 4's company to fakecorp", h13);
  console.log("Step 1:", J(r13a.data?.result ?? r13a));
  if (r13a.data?.result?.type === 'clarify' && r13a.data.result.question.includes('PENDING_INTENT')) {
    h13.push({ role: "user", text: "update contact 4's company to fakecorp" });
    h13.push({ role: "assistant", text: r13a.data.result.question });
    let r13b = await sendChat("no", h13);
    console.log("Step 2 (no):", J(r13b.data?.result ?? r13b));
  }
}

run().catch(console.error);
