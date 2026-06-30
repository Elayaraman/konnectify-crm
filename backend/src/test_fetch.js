async function run() {
  try {
    const response = await fetch('http://127.0.0.1:4000/api/copilot', {
      method: 'POST',
      body: JSON.stringify({
        message: "assign that ticket to freshworks company",
        history: [
          { role: "user", text: "create a ticket for mona with scratches on her phone screen" },
          { role: "assistant", text: "Created ticket #16: Scratches on phone screen" }
        ]
      }),
      headers: { "Content-Type": "application/json" }
    });
    const text = await response.text();
    console.log("STATUS:", response.status);
    console.log("BODY:", text);
  } catch (error) {
    console.log("NETWORK ERROR:", error.message);
  }
}
run();
