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

type CreateTicketIntent = {
  action: "create_ticket";
  title: string;
  description: string;
  priority?: TicketPriority;
  company_name: string;
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
};

type ClarifyIntent = {
  action: "clarify";
  question: string;
};

type UnknownIntent = {
  action: "unknown";
  raw_action: string;
};

export type Intent =
  | CreateTicketIntent
  | UpdateTicketIntent
  | ListTicketsIntent
  | ClarifyIntent
  | UnknownIntent;

type ActionResult = {
  type: "action";
  action: "created" | "updated";
  ticket: RichTicket;
};

type ListResult = {
  type: "list";
  tickets: RichTicket[];
};

type ClarifyResult = {
  type: "clarify";
  question: string;
};

export type Result = ActionResult | ListResult | ClarifyResult;

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

const systemPrompt = `
You are the intent parser for Konnectify CRM. Return ONLY valid JSON. Do not include markdown fences, prose, comments, or extra keys.

Valid shapes:
{"action":"create_ticket","title":"string","description":"string","priority":"low|medium|high|urgent","company_name":"string","contact_name":"optional string"}
{"action":"update_ticket","ticket_id":123,"status":"open|in_progress|resolved|closed","priority":"low|medium|high|urgent"}
{"action":"list_tickets","company_name":"optional string","status":"open|in_progress|resolved|closed"}
{"action":"clarify","question":"string"}

Rules:
- priority values must be one of: ${TICKET_PRIORITIES.join(", ")}.
- status values must be one of: ${TICKET_STATUSES.join(", ")}.
- If the user's request lacks required information or is ambiguous, return action "clarify".
- For create_ticket, infer a concise title and useful description when possible.
- For update_ticket, require a numeric ticket_id.
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

    if (!title || !description || !companyName) {
      throw new Error("create_ticket requires title, description, and company_name.");
    }

    if (priorityValue !== undefined && !priority) {
      throw new Error("create_ticket priority is invalid.");
    }

    return {
      action,
      title,
      description,
      company_name: companyName,
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

    if (statusValue !== undefined && !status) {
      throw new Error("list_tickets status is invalid.");
    }

    return {
      action,
      ...(companyName ? { company_name: companyName } : {}),
      ...(status ? { status } : {}),
    };
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

async function requestGeminiIntent(message: string): Promise<string> {
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

export async function parseIntent(message: string): Promise<Intent> {
  const responseText = await requestGeminiIntent(message);
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
      const company = findCompanyByName(intent.company_name);

      if (!company) {
        return {
          type: "clarify",
          question: `Which company did you mean by "${intent.company_name}"?`,
        };
      }

      const companyContacts = contactService
        .getAll()
        .filter((contact) => contact.company_id === company.id);

      if (companyContacts.length === 0) {
        return {
          type: "clarify",
          question: `${company.name} does not have any contacts yet. Which contact should own this ticket?`,
        };
      }

      const contact = intent.contact_name
        ? findContactByName(companyContacts, intent.contact_name)
        : companyContacts[0];

      if (!contact) {
        return {
          type: "clarify",
          question: `Which ${company.name} contact did you mean by "${intent.contact_name}"?`,
        };
      }

      const ticket = ticketService.create({
        title: intent.title,
        description: intent.description,
        status: "open",
        priority: intent.priority ?? "medium",
        contact_id: contact.id,
        company_id: company.id,
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

      return { type: "list", tickets };
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
