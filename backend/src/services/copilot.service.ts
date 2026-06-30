import { companyService } from "./company.service";
import { contactService } from "./contact.service";
import { ticketService } from "./ticket.service";
import type {
  Company,
  ContactWithCompany,
  RichTicket,
  TicketPriority,
  TicketStatus,
} from "../types";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../types";

export type ChatTurn = { role: "user" | "assistant"; text: string };

type CreateTicketIntent = {
  action: "create_ticket";
  title: string;
  description: string;
  priority?: TicketPriority;
  company_name?: string;
  contact_name?: string;
};

type UpdateTicketIntent = {
  action: "update_ticket";
  ticket_id: number;
  status?: TicketStatus;
  priority?: TicketPriority;
};

type ListTicketsIntent = {
  action: "list_tickets";
  company_name?: string;
  status?: TicketStatus;
  mode?: "list" | "count";
};

type ClarifyIntent = {
  action: "clarify";
  question: string;
};

type DeleteTicketIntent = {
  action: "delete_ticket";
  ticket_id: number;
};

type UnknownIntent = {
  action: "unknown";
  raw_action: string;
};

export type Intent =
  | CreateTicketIntent
  | UpdateTicketIntent
  | ListTicketsIntent
  | DeleteTicketIntent
  | ClarifyIntent
  | UnknownIntent;

type ActionResult = {
  type: "action";
  action: "created" | "updated";
  ticket: RichTicket;
};

type DeleteResult = {
  type: "action";
  action: "deleted";
  ticket_id: number;
};

type ListResult = {
  type: "list";
  tickets: RichTicket[];
  mode: "list" | "count";
};

type ClarifyResult = {
  type: "clarify";
  question: string;
};

export type Result = ActionResult | DeleteResult | ListResult | ClarifyResult;

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const geminiModel = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;

// Note: The seed database only contains Rapido, Airbus, and Hotstar.
// Fake company names like "acme" will intentionally fail to resolve downstream and trigger a clarification.
const systemPrompt = `
You are the intent parser for Konnectify CRM. Return ONLY valid JSON. Do not include markdown fences, prose, comments, or extra keys.

Valid shapes:
{"action":"create_ticket","title":"string","description":"string","priority":"low|medium|high|urgent","company_name":"optional string","contact_name":"optional string"}
{"action":"update_ticket","ticket_id":123,"status":"open|in_progress|resolved|closed","priority":"low|medium|high|urgent"}
{"action":"delete_ticket","ticket_id":123}
{"action":"list_tickets","company_name":"optional string","status":"open|in_progress|resolved|closed","mode":"list|count"}
{"action":"clarify","question":"string"}

Rules:
- priority values must be one of: ${TICKET_PRIORITIES.join(", ")}.
- status values must be one of: ${TICKET_STATUSES.join(", ")}.
- For create_ticket: be aggressive about defaults. If the user describes a problem but gives no explicit title, derive a short title from their description. If no detailed description is given beyond a one-line complaint, use that line as the description. If no priority is given, omit the priority field entirely — the system will default it. Both company_name and contact_name are optional; only ask for them if the user seems to want a specific company/contact assigned but hasn't said which. Do not ask for title, description, or priority since those can be inferred or defaulted.
  - Example: User says "Make a new ticket, the laptop screen has a deep scratch" -> output {"action":"create_ticket","title":"Deep scratch on laptop screen","description":"the laptop screen has a deep scratch"}. Zero clarifying questions, act immediately.
- For update_ticket: require a numeric ticket_id. Map casual phrasing to the closest valid status — "done", "fixed", "completed" → "resolved"; "close", "closed it out", "shut it down" → "closed"; "working on it", "in progress", "started" → "in_progress"; "reopen", "reopen it", "open it again" → "open". Do not ask for clarification if casual phrasing clearly maps to a status.
- For list_tickets: no special defaults needed; an empty filter returns everything. Add \`mode: "count"\` for phrases asking for totals (e.g. 'how many tickets', 'count', 'total number of', 'how much tickets we have'). For general listing (e.g. 'show me', 'list', 'what are', 'which tickets'), use \`mode: "list"\` or omit the mode.
- Only return action "clarify" when genuinely required information is missing and cannot be inferred from context or conversation history.
- Multi-turn context: If your previous turn was a clarifying question, you MUST interpret the user's short reply as the direct answer to that specific question (this applies to ANY single field being resolved via clarify — priority, status, ticket_id, company, or contact). Carry forward any fields established earlier in the conversation and emit the original intent using the new value, rather than starting a fresh classification and returning clarify again. A single-word reply to a clarifying question is never grounds to ask which action was originally intended — the action is already established by the conversation history.
  - Example: You asked 'Which company did you mean?', user replies 'acme' -> return a create_ticket intent carrying forward the original title/description with company_name='acme', rather than returning a new clarify.
  - Example: You asked 'What priority should I use?', user replies 'high' -> return the original intent (e.g. update_ticket or create_ticket) with the existing context carried forward and priority='high'.
`.trim();

function getGeminiApiKey(): string {
  const apiKey = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    process.env.LLM_API_KEY,
    process.env.AI_API_KEY,
  ].find((value) => value !== undefined && value.trim().length > 0);

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or compatible LLM API key.");
  }

  return apiKey;
}

function stripJsonFences(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  const parsed = typeof value === "number" ? value : Number.NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isTicketStatus(value: string): value is TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus);
}

function isTicketPriority(value: string): value is TicketPriority {
  return TICKET_PRIORITIES.includes(value as TicketPriority);
}

function readStatus(
  record: Record<string, unknown>,
  key: string,
): TicketStatus | undefined {
  const value = readString(record, key);
  return value && isTicketStatus(value) ? value : undefined;
}

function readPriority(
  record: Record<string, unknown>,
  key: string,
): TicketPriority | undefined {
  const value = readString(record, key);
  return value && isTicketPriority(value) ? value : undefined;
}

function validateIntent(value: unknown): Intent {
  if (!isRecord(value)) {
    throw new Error("Copilot response must be a JSON object.");
  }

  const action = readString(value, "action");

  if (!action) {
    throw new Error("Copilot response is missing an action.");
  }

  if (action === "create_ticket") {
    const title = readString(value, "title");
    const description = readString(value, "description");
    const companyName = readString(value, "company_name");
    const priorityValue = value.priority;
    const priority = readPriority(value, "priority");
    const contactName = readString(value, "contact_name");

    if (!title || !description) {
      throw new Error("create_ticket requires title and description.");
    }

    if (priorityValue !== undefined && !priority) {
      throw new Error("create_ticket priority is invalid.");
    }

    return {
      action,
      title,
      description,
      ...(companyName ? { company_name: companyName } : {}),
      ...(priority ? { priority } : {}),
      ...(contactName ? { contact_name: contactName } : {}),
    };
  }

  if (action === "update_ticket") {
    const ticketId = readNumber(value, "ticket_id");
    const statusValue = value.status;
    const priorityValue = value.priority;
    const status = readStatus(value, "status");
    const priority = readPriority(value, "priority");

    if (!ticketId) {
      throw new Error("update_ticket requires a positive numeric ticket_id.");
    }

    if (statusValue !== undefined && !status) {
      throw new Error("update_ticket status is invalid.");
    }

    if (priorityValue !== undefined && !priority) {
      throw new Error("update_ticket priority is invalid.");
    }

    if (!status && !priority) {
      return {
        action: "clarify",
        question: "What status or priority should I set for that ticket?",
      };
    }

    return {
      action,
      ticket_id: ticketId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };
  }

  if (action === "list_tickets") {
    const statusValue = value.status;
    const status = readStatus(value, "status");
    const companyName = readString(value, "company_name");
    const modeValue = readString(value, "mode");
    const mode = modeValue === "count" ? "count" : "list";

    if (statusValue !== undefined && !status) {
      throw new Error("list_tickets status is invalid.");
    }

    return {
      action,
      mode,
      ...(companyName ? { company_name: companyName } : {}),
      ...(status ? { status } : {}),
    };
  }

  if (action === "delete_ticket") {
    const ticketId = readNumber(value, "ticket_id");

    if (!ticketId) {
      throw new Error("delete_ticket requires a positive numeric ticket_id.");
    }

    return { action, ticket_id: ticketId };
  }

  if (action === "clarify") {
    const question = readString(value, "question");

    if (!question) {
      throw new Error("clarify requires a question.");
    }

    return { action, question };
  }

  return { action: "unknown", raw_action: action };
}

function findCompanyByName(companyName: string): Company | undefined {
  const normalizedName = companyName.toLowerCase();

  return companyService
    .getAll()
    .find((company) => company.name.toLowerCase().includes(normalizedName));
}

function findContactByName(
  contacts: ContactWithCompany[],
  contactName: string,
): ContactWithCompany | undefined {
  const normalizedName = contactName.toLowerCase();

  return contacts.find((contact) =>
    contact.name.toLowerCase().includes(normalizedName),
  );
}

async function requestGeminiIntent(message: string, history: ChatTurn[] = []): Promise<string> {
  const historyContents = history.map((turn) => ({
    role: turn.role === "assistant" ? "model" : "user",
    parts: [{ text: turn.text }],
  }));

  const response = await fetch(geminiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": getGeminiApiKey(),
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        ...historyContents,
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });

  const body = (await response.json()) as GeminiGenerateContentResponse;

  if (!response.ok) {
    throw new Error(body.error?.message ?? "Gemini API request failed.");
  }

  const text = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

export async function parseIntent(message: string, history: ChatTurn[] = []): Promise<Intent> {
  const responseText = await requestGeminiIntent(message, history);
  const jsonText = stripJsonFences(responseText);

  try {
    return validateIntent(JSON.parse(jsonText) as unknown);
  } catch (caughtError) {
    const message =
      caughtError instanceof Error ? caughtError.message : "Unknown parse error.";
    throw new Error(`Failed to parse Copilot JSON response: ${message}`);
  }
}

export async function executeIntent(intent: Intent): Promise<Result> {
  switch (intent.action) {
    case "create_ticket": {
      let company: Company | undefined;

      if (intent.company_name) {
        company = findCompanyByName(intent.company_name);
        if (!company) {
          return {
            type: "clarify",
            question: `Which company did you mean by "${intent.company_name}"?`,
          };
        }
      }

      let contact: ContactWithCompany | undefined;

      if (intent.contact_name) {
        const availableContacts = company
          ? contactService.getAll().filter((c) => c.company_id === company.id)
          : contactService.getAll();

        contact = findContactByName(availableContacts, intent.contact_name);

        if (!contact) {
          return {
            type: "clarify",
            question: company
              ? `Which ${company.name} contact did you mean by "${intent.contact_name}"?`
              : `Which contact did you mean by "${intent.contact_name}"?`,
          };
        }
      }

      const ticket = ticketService.create({
        title: intent.title,
        description: intent.description,
        status: "open",
        priority: intent.priority ?? "medium",
        contact_id: contact?.id ?? null,
        company_id: company?.id ?? null,
      });

      return { type: "action", action: "created", ticket };
    }

    case "update_ticket": {
      const ticket = ticketService.update(intent.ticket_id, {
        ...(intent.status ? { status: intent.status } : {}),
        ...(intent.priority ? { priority: intent.priority } : {}),
      });

      if (!ticket) {
        return {
          type: "clarify",
          question: `Ticket ${intent.ticket_id} was not found. Which ticket should I update?`,
        };
      }

      return { type: "action", action: "updated", ticket };
    }

    case "list_tickets": {
      const company = intent.company_name
        ? findCompanyByName(intent.company_name)
        : undefined;

      if (intent.company_name && !company) {
        return {
          type: "clarify",
          question: `Which company did you mean by "${intent.company_name}"?`,
        };
      }

      const tickets = ticketService.getAll({
        ...(intent.status ? { status: intent.status } : {}),
        ...(company ? { company_id: company.id } : {}),
      });

      return { type: "list", tickets, mode: intent.mode ?? "list" };
    }

    case "delete_ticket": {
      const deleted = ticketService.delete(intent.ticket_id);

      if (!deleted) {
        return {
          type: "clarify",
          question: `Ticket ${intent.ticket_id} was not found. Which ticket should I delete?`,
        };
      }

      return { type: "action", action: "deleted", ticket_id: intent.ticket_id };
    }

    case "clarify":
      return { type: "clarify", question: intent.question };

    default:
      return {
        type: "clarify",
        question: "I could not understand that request. Can you rephrase it?",
      };
  }
}
