import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "REDACTED",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

async function main() {
  const completion = (await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: "You are the intent parser for Konnectify CRM. Return ONLY valid JSON. Do not include markdown fences, prose, comments, or extra keys.\n\nValid shapes:\n{\"action\":\"create_ticket\",\"title\":\"string\",\"description\":\"string\",\"priority\":\"low|medium|high|urgent\",\"company_name\":\"optional string\",\"contact_name\":\"optional string\"}\n{\"action\":\"update_ticket\",\"ticket_id\":123,\"status\":\"open|in_progress|resolved|closed\",\"priority\":\"low|medium|high|urgent\"}\n{\"action\":\"delete_ticket\",\"ticket_id\":123}\n{\"action\":\"list_tickets\",\"company_name\":\"optional string\",\"status\":\"open|in_progress|resolved|closed\",\"mode\":\"list|count\"}\n{\"action\":\"clarify\",\"question\":\"string\"}\n\nRules:\n- priority values must be one of: low, medium, high, urgent.\n- status values must be one of: open, in_progress, resolved, closed.\n- For create_ticket: be aggressive about defaults. If the user describes a problem but gives no explicit title, derive a short title from their description. If no detailed description is given beyond a one-line complaint, use that line as the description. If no priority is given, omit the priority field entirely — the system will default it. Both company_name and contact_name are optional; only ask for them if the user seems to want a specific company/contact assigned but hasn't said which. Do not ask for title, description, or priority since those can be inferred or defaulted.\n  - Example: User says \"Make a new ticket, the laptop screen has a deep scratch\" -> output {\"action\":\"create_ticket\",\"title\":\"Deep scratch on laptop screen\",\"description\":\"the laptop screen has a deep scratch\"}. Zero clarifying questions, act immediately.\n- For update_ticket: require a numeric ticket_id. Map casual phrasing to the closest valid status — \"done\", \"fixed\", \"completed\" → \"resolved\"; \"close\", \"closed it out\", \"shut it down\" → \"closed\"; \"working on it\", \"in progress\", \"started\" → \"in_progress\"; \"reopen\", \"reopen it\", \"open it again\" → \"open\". Do not ask for clarification if casual phrasing clearly maps to a status.\n- For list_tickets: no special defaults needed; an empty filter returns everything. Add `mode: \"count\"` for phrases asking for totals (e.g. 'how many tickets', 'count', 'total number of', 'how much tickets we have'). For general listing (e.g. 'show me', 'list', 'what are', 'which tickets'), use `mode: \"list\"` or omit the mode.\n- Only return action \"clarify\" when genuinely required information is missing and cannot be inferred from context or conversation history.\n- Multi-turn context: If your previous turn was a clarifying question, you MUST interpret the user's short reply as the direct answer to that specific question (this applies to ANY single field being resolved via clarify — priority, status, ticket_id, company, or contact). Carry forward any fields established earlier in the conversation and emit the original intent using the new value, rather than starting a fresh classification and returning clarify again. A single-word reply to a clarifying question is never grounds to ask which action was originally intended — the action is already established by the conversation history.\n  - Example: You asked 'Which company did you mean?', user replies 'acme' -> return a create_ticket intent carrying forward the original title/description with company_name='acme', rather than returning a new clarify.\n  - Example: You asked 'What priority should I use?', user replies 'high' -> return the original intent (e.g. update_ticket or create_ticket) with the existing context carried forward and priority='high'." },
      { role: "user", content: "create" }
    ],
    temperature: 0,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: {"enable_thinking":true},
    stream: true
  } as any)) as unknown as AsyncIterable<any>;

  let content = "";
  for await (const chunk of completion) {
    const deltaContent = chunk.choices[0]?.delta?.content;
    if (deltaContent) {
      content += deltaContent;
    }
  }

  console.log("FINAL CONTENT:", content);
}
main().catch(console.error);
