import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: "REDACTED",
  baseURL: "https://integrate.api.nvidia.com/v1",
});
async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [{"role": "system", "content": "Return JSON."}, {"content":"create","role":"user"}],
    temperature: 0,
    top_p: 0.95,
    max_tokens: 16384,
    response_format: { type: "json_object" },
    stream: false
  });
  console.log(completion.choices[0]?.message?.content);
}
main().catch(console.error);
