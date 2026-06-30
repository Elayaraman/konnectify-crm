import { parseIntent } from "./src/services/copilot.service";

async function main() {
  console.log("Calling parseIntent...");
  try {
    const result = await parseIntent("create a high priority ticket for rapido, the app crashes on login");
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("ERROR:", err);
  }
}
main();
