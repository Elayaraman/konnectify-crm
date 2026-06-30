const http = require('http');

async function sendChat(message, history = []) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, history });
    const req = http.request(
      'http://127.0.0.1:4000/api/copilot',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("--- TEST 1 ---");
  let res1 = await sendChat("create a contact priya from rapido");
  if (!res1.success) {
    console.error("Test 1 failed", res1);
    return;
  }
  console.log("Create Priya:", res1.data.result);
  let res2 = await sendChat("create a ticket for priya about a billing issue");
  console.log("Create Ticket:", res2.data.result);

  console.log("\n--- TEST 2 ---");
  await sendChat("create a contact priya from airbus");
  let res3 = await sendChat("create a ticket for the contact named priya about login issues");
  console.log("Ambiguous Priya:", res3.data?.result);

  console.log("\n--- TEST 3 ---");
  let res4 = await sendChat("delete company rapido");
  console.log("Delete Rapido:", res4.data?.result);
  let res5 = await sendChat("list all tickets");
  console.log("Tickets after Rapido delete:", res5.data?.result?.tickets);
  let res6 = await sendChat("list all contacts");
  console.log("Contacts after Rapido delete:", res6.data?.result?.contacts);

  console.log("\n--- TEST 4 ---");
  let res7 = await sendChat("delete contact 1");
  console.log("Delete contact 1:", res7.data?.result);
  let res8 = await sendChat("list all tickets");
  console.log("Tickets after Contact 1 delete:", res8.data?.result?.tickets?.find(t => t.id === 1));

  console.log("\n--- TEST 5 ---");
  let res9 = await sendChat("move ticket 2 to airbus and reassign it to a contact there");
  console.log("Compound update:", res9.data?.result);

  console.log("\n--- TEST 6 ---");
  let res10 = await sendChat("update contact 2's company to hotstar");
  console.log("Update contact 2 company:", res10.data?.result);
  let res11 = await sendChat("list all tickets");
  console.log("Tickets after contact 2 move:", res11.data?.result?.tickets);

  console.log("\n--- TEST 7 ---");
  let res12 = await sendChat("create a ticket for hotstar, assign it to a contact from airbus");
  console.log("Conflicting references:", res12.data?.result);

  console.log("\n--- TEST 8 ---");
  let res13 = await sendChat("delete the ticket for hotstar");
  console.log("Ambiguous delete:", res13.data?.result);

  console.log("\n--- TEST 9 ---");
  let res14 = await sendChat("how many tickets does airbus have");
  console.log("Count Airbus (1):", res14.data?.result);
  await sendChat("create one for airbus");
  let res15 = await sendChat("how many tickets does airbus have");
  console.log("Count Airbus (2):", res15.data?.result);

  console.log("\n--- TEST 10 ---");
  let res16 = await sendChat("create a contact with no company specified");
  console.log("Create unassigned contact:", res16.data?.result);
  let res17 = await sendChat("list all contacts");
  console.log("List all contacts:", res17.data?.result?.contacts?.slice(-1));

  console.log("\n--- TEST 11 ---");
  let history11 = [];
  let res18 = await sendChat("update contact 3's company to acme", history11);
  console.log("Update to acme:", res18.data?.result);
  history11.push({ role: "user", text: "update contact 3's company to acme" });
  history11.push({ role: "assistant", text: res18.data?.result?.question });
  let res19 = await sendChat("yes", history11);
  console.log("Reply yes:", res19.data?.result);

  console.log("\n--- TEST 12 ---");
  let history12 = [];
  let res20 = await sendChat("create a ticket for nonexistentcorp about a server outage", history12);
  console.log("Create for nonexistentcorp:", res20.data?.result);
  history12.push({ role: "user", text: "create a ticket for nonexistentcorp about a server outage" });
  history12.push({ role: "assistant", text: res20.data?.result?.question });
  let res21 = await sendChat("yes", history12);
  console.log("Reply yes:", res21.data?.result);

  console.log("\n--- TEST 13 ---");
  let history13 = [];
  let res22 = await sendChat("update contact 4's company to acme", history13);
  console.log("Update to acme (no):", res22.data?.result);
  history13.push({ role: "user", text: "update contact 4's company to acme" });
  history13.push({ role: "assistant", text: res22.data?.result?.question });
  let res23 = await sendChat("no", history13);
  console.log("Reply no:", res23.data?.result);
}

run().catch(console.error);
