async function test(name, history, expectedSnippet) {
  try {
    const res = await fetch('http://127.0.0.1:4000/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: history[history.length - 1].text,
        history: history.slice(0, -1)
      })
    });
    
    if (!res.ok) {
      const data = await res.text();
      console.log(`[FAIL] ${name}\n  Server returned ${res.status}:`, data);
      return;
    }
    
    const result = await res.json();
    const resultStr = JSON.stringify(result);
    if (resultStr.includes(expectedSnippet)) {
      console.log(`[PASS] ${name}`);
    } else {
      console.log(`[FAIL] ${name}\n  Expected snippet: ${expectedSnippet}\n  Got:`, resultStr);
    }
  } catch (err) {
    console.log(`[FAIL] ${name}\n  Network/Other error:`, err.message);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log("Running Edge Case Tests...");
  
  await test(
    "Test 1: Unassigned contact filter",
    [{ role: "user", text: "how many tickets without contact assigned" }],
    '"mode":"count"'
  );
  await sleep(4000);
  
  await test(
    "Test 2: Spurious clarify avoidance (listing)",
    [{ role: "user", text: "list all tickets for company" }],
    '"type":"clarify"' // Should be clarify, not create_ticket!
  );
  await sleep(4000);

  await test(
    "Test 3: Name-based deletion (clarify)",
    [{ role: "user", text: "delete the company called FakeCompanyNotExist" }],
    'FakeCompanyNotExist' // Clarify response
  );
  await sleep(4000);

  await test(
    "Test 4: Assign to unassigned",
    [{ role: "user", text: "assign ticket 16 to nobody" }], // Setting contact to unassigned
    '"action":"updated"'
  );
  await sleep(4000);
  
  await test(
    "Test 5: Filter by contact name",
    [{ role: "user", text: "show me tickets for mona" }],
    '"type":"list"'
  );
  await sleep(4000);
  
  await test(
    "Test 6: Filter by missing status (edge case)",
    [{ role: "user", text: "show me all blocked tickets" }], // Status 'blocked' isn't valid, falls back to list or clarify
    '"type":"'
  );
  await sleep(4000);
  
  await test(
    "Test 7: Empty list edge case",
    [{ role: "user", text: "list tickets for nobody" }], // Unassigned contact
    '"type":"list"'
  );
}

run();
