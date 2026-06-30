import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: "REDACTED",
  baseURL: "https://integrate.api.nvidia.com/v1",
});
async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [{"content":"create","role":"user"}],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    // @ts-expect-error test
    reasoning_budget: 16384,
    chat_template_kwargs: {"enable_thinking":true},
    stream: true
  });
  
  for await (const chunk of completion) {
    // @ts-expect-error test
    const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) process.stdout.write("REASONING: " + reasoning + "\n");
    if (chunk.choices[0]?.delta?.content) {
      process.stdout.write("CONTENT: " + chunk.choices[0]?.delta?.content + "\n");
    }
  }
}
main();
