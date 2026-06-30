const axios = require('axios');

async function run() {
  try {
    const response = await axios.post('http://127.0.0.1:4000/api/copilot', {
      message: "assign that ticket to freshworks company",
      history: [
        { role: "user", text: "create a ticket for mona with scratches on her phone screen" },
        { role: "assistant", text: "Created ticket #16: Scratches on phone screen" }
      ]
    }, {
      headers: { "Content-Type": "application/json" }
    });
    console.log("SUCCESS:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log("RESPONSE ERROR:", error.response.status, error.response.data);
    } else if (error.request) {
      console.log("NETWORK ERROR:", error.message);
    } else {
      console.log("OTHER ERROR:", error.message);
    }
  }
}

run();
