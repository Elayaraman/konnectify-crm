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

import OpenAI from "openai";

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
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  company_name?: string;
  contact_name?: string;
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

type CreateCompanyIntent = {
  action: "create_company";
  name: string;
  domain?: string;
  plan?: string;
};

type UpdateCompanyIntent = {
  action: "update_company";
  company_id: number;
  name?: string;
  domain?: string;
  plan?: string;
};

type DeleteCompanyIntent = {
  action: "delete_company";
  company_id: number;
};

type ListCompaniesIntent = {
  action: "list_companies";
  name?: string;
  mode?: "list" | "count";
};

type CreateContactIntent = {
  action: "create_contact";
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
};

type UpdateContactIntent = {
  action: "update_contact";
  contact_id: number;
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
};

type DeleteContactIntent = {
  action: "delete_contact";
  contact_id: number;
};

type ListContactsIntent = {
  action: "list_contacts";
  name?: string;
  company_name?: string;
  mode?: "list" | "count";
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
  | CreateCompanyIntent
  | UpdateCompanyIntent
  | ListCompaniesIntent
  | DeleteCompanyIntent
  | CreateContactIntent
  | UpdateContactIntent
  | ListContactsIntent
  | DeleteContactIntent
  | ClarifyIntent
  | UnknownIntent;

type ActionResult = {
  type: "action";
  action: "created" | "updated";
  ticket?: RichTicket;
  company?: Company;
  contact?: ContactWithCompany;
};

type DeleteResult = {
  type: "action";
  action: "deleted";
  ticket_id?: number;
  company_id?: number;
  contact_id?: number;
};

type ListResult = {
  type: "list";
  tickets?: RichTicket[];
  companies?: Company[];
  contacts?: ContactWithCompany[];
  mode: "list" | "count";
};

type ClarifyResult = {
  type: "clarify";
  question: string;
};

export type Result = ActionResult | DeleteResult | ListResult | ClarifyResult;

// Note: The seed database only contains Rapido, Airbus, and Hotstar.
// Fake company names like "acme" will intentionally fail to resolve downstream and trigger a clarification.
const systemPrompt = `
You are the intent parser for Konnectify CRM. Return ONLY valid JSON. Do not include markdown fences, prose, comments, or extra keys.

Valid shapes:
{"action":"create_ticket","title":"string","description":"string","priority":"low|medium|high|urgent","company_name":"optional string","contact_name":"optional string"}
{"action":"update_ticket","ticket_id":123,"title":"optional string","description":"optional string","status":"open|in_progress|resolved|closed","priority":"low|medium|high|urgent","company_name":"optional string","contact_name":"optional string"}
{"action":"delete_ticket","ticket_id":123}
{"action":"list_tickets","company_name":"optional string","status":"open|in_progress|resolved|closed","mode":"list|count"}
{"action":"create_company","name":"string","domain":"optional string","plan":"optional string"}
{"action":"update_company","company_id":123,"name":"optional string","domain":"optional string","plan":"optional string"}
{"action":"delete_company","company_id":123}
{"action":"list_companies","name":"optional string","mode":"list|count"}
{"action":"create_contact","name":"string","email":"optional string","phone":"optional string","company_name":"optional string"}
{"action":"update_contact","contact_id":123,"name":"optional string","email":"optional string","phone":"optional string","company_name":"optional string"}
{"action":"delete_contact","contact_id":123}
{"action":"list_contacts","name":"optional string","company_name":"optional string","mode":"list|count"}
{"action":"clarify","question":"string"}

Rules:
- priority values must be one of: ${TICKET_PRIORITIES.join(", ")}.
- status values must be one of: ${TICKET_STATUSES.join(", ")}.
- For create_ticket: be aggressive about defaults. If the user describes a problem but gives no explicit title, derive a short title from their description. If no detailed description is given beyond a one-line complaint, use that line as the description. If no priority is given, omit the priority field entirely — the system will default it. Both company_name and contact_name are optional; only ask for them if the user seems to want a specific company/contact assigned but hasn't said which. Do not ask for title, description, or priority since those can be inferred or defaulted.
  - Example: User says "Make a new ticket, the laptop screen has a deep scratch" -> output {"action":"create_ticket","title":"Deep scratch on laptop screen","description":"the laptop screen has a deep scratch"}. Zero clarifying questions, act immediately.
- For update_ticket: require a numeric ticket_id. Map casual phrasing to the closest valid status — "done", "fixed", "completed" → "resolved"; "close", "closed it out", "shut it down" → "closed"; "working on it", "in progress", "started" → "in_progress"; "reopen", "reopen it", "open it again" → "open". Do not ask for clarification if casual phrasing clearly maps to a status. You can also update title, description, company_name, and contact_name.
- For create_company: automatically generate dummy values for domain and plan if they are missing (e.g., domain: "example.com", plan: "Basic"). Do NOT ask for clarification.
- For create_contact: automatically generate dummy values for email and phone if they are missing (e.g., email: "placeholder@example.com", phone: "+1 000 000 0000"). Do NOT ask for clarification.
- For list_* actions: no special defaults needed; an empty filter returns everything. Add \`mode: "count"\` for phrases asking for totals (e.g. 'how many tickets', 'count', 'total number of', 'how much tickets we have'). For general listing (e.g. 'show me', 'list', 'what are', 'which tickets'), use \`mode: "list"\` or omit the mode.
- Only return action "clarify" when genuinely required information is missing and cannot be inferred from context or conversation history.
- Multi-turn context: If your previous turn was a clarifying question, you MUST interpret the user's short reply as the direct answer to that specific question (this applies to ANY single field being resolved via clarify — priority, status, ticket_id, company, or contact). Carry forward any fields established earlier in the conversation and emit the original intent using the new value, rather than starting a fresh classification and returning clarify again. A single-word reply to a clarifying question is never grounds to ask which action was originally intended — the action is already established by the conversation history.
  - Example: You asked 'Which company did you mean?', user replies 'acme' -> return a create_ticket intent carrying forward the original title/description with company_name='acme', rather than returning a new clarify.
  - Example: You asked 'What priority should I use?', user replies 'high' -> return the original intent (e.g. update_ticket or create_ticket) with the existing context carried forward and priority='high'.
`.trim();

const openai = new OpenAI({
  apiKey: "REDACTED",
  baseURL: "https://integrate.api.nvidia.com/v1",
});

function stripJsonFences(value: string): string {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return value.substring(start, end + 1);
  }
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
    const title = readString(value, "title");
    const description = readString(value, "description");
    const companyName = readString(value, "company_name");
    const contactName = readString(value, "contact_name");
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

    if (!status && !priority && !title && !description && !companyName && !contactName) {
      return {
        action: "clarify",
        question: "What would you like to update on that ticket?",
      };
    }

    return {
      action,
      ticket_id: ticketId,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(companyName ? { company_name: companyName } : {}),
      ...(contactName ? { contact_name: contactName } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    };
  }

  if (action === "create_company") {
    const name = readString(value, "name");
    if (!name) throw new Error("create_company requires a name.");
    return {
      action,
      name,
      domain: readString(value, "domain") ?? "example.com",
      plan: readString(value, "plan") ?? "Basic",
    };
  }

  if (action === "update_company") {
    const companyId = readNumber(value, "company_id");
    if (!companyId) throw new Error("update_company requires a positive numeric company_id.");
    return {
      action,
      company_id: companyId,
      ...(readString(value, "name") ? { name: readString(value, "name") } : {}),
      ...(readString(value, "domain") ? { domain: readString(value, "domain") } : {}),
      ...(readString(value, "plan") ? { plan: readString(value, "plan") } : {}),
    };
  }

  if (action === "delete_company") {
    const companyId = readNumber(value, "company_id");
    if (!companyId) throw new Error("delete_company requires a positive numeric company_id.");
    return { action, company_id: companyId };
  }

  if (action === "list_companies") {
    return {
      action,
      ...(readString(value, "name") ? { name: readString(value, "name") } : {}),
      mode: readString(value, "mode") === "count" ? "count" : "list",
    };
  }

  if (action === "create_contact") {
    const name = readString(value, "name");
    if (!name) throw new Error("create_contact requires a name.");
    return {
      action,
      name,
      email: readString(value, "email") ?? "placeholder@example.com",
      phone: readString(value, "phone") ?? "+1 000 000 0000",
      ...(readString(value, "company_name") ? { company_name: readString(value, "company_name") } : {}),
    };
  }

  if (action === "update_contact") {
    const contactId = readNumber(value, "contact_id");
    if (!contactId) throw new Error("update_contact requires a positive numeric contact_id.");
    return {
      action,
      contact_id: contactId,
      ...(readString(value, "name") ? { name: readString(value, "name") } : {}),
      ...(readString(value, "email") ? { email: readString(value, "email") } : {}),
      ...(readString(value, "phone") ? { phone: readString(value, "phone") } : {}),
      ...(readString(value, "company_name") ? { company_name: readString(value, "company_name") } : {}),
    };
  }

  if (action === "delete_contact") {
    const contactId = readNumber(value, "contact_id");
    if (!contactId) throw new Error("delete_contact requires a positive numeric contact_id.");
    return { action, contact_id: contactId };
  }

  if (action === "list_contacts") {
    return {
      action,
      ...(readString(value, "name") ? { name: readString(value, "name") } : {}),
      ...(readString(value, "company_name") ? { company_name: readString(value, "company_name") } : {}),
      mode: readString(value, "mode") === "count" ? "count" : "list",
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

async function requestModelIntent(
  message: string,
  history: ChatTurn[] = [],
  systemInstructionOverride?: string,
): Promise<string> {
  const historyContents: OpenAI.Chat.ChatCompletionMessageParam[] = history.map((turn) => ({
    role: turn.role === "assistant" ? "assistant" : "user",
    content: turn.text,
  }));

  const completion = (await openai.chat.completions.create({
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    messages: [
      { role: "system", content: systemInstructionOverride ?? systemPrompt },
      ...historyContents,
      { role: "user", content: message }
    ],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 16384,
    reasoning_budget: 16384,
    chat_template_kwargs: {"enable_thinking":true},
    stream: true
  } as any)) as unknown as AsyncIterable<any>;

  let content = "";
  for await (const chunk of completion) {
    const reasoning = chunk.choices[0]?.delta?.reasoning_content;
    if (reasoning) {
      process.stdout.write(reasoning);
    }

    const deltaContent = chunk.choices[0]?.delta?.content;
    if (deltaContent) {
      process.stdout.write(deltaContent);
      content += deltaContent;
    }
  }
  process.stdout.write("\n");

  if (!content) {
    throw new Error("Model returned an empty response.");
  }

  return content;
}

// Two prior prompt-only fix attempts did not reliably prevent Gemini from returning a clarify
// action asking for company or priority when the user wants to create a ticket.
// This guard detects that specific failure pattern so we can override it.
function isSpuriousCreateClarify(question: string): boolean {
  const lower = question.toLowerCase();
  // Legitimate clarifies include "Which company did you mean?" or "Which contact did you mean?"
  // Spurious ones generally ask "provide the company name" or "what is the priority" outright.
  // We intercept if it mentions company or priority and it's not a standard resolution question.
  return lower.includes("company") || lower.includes("priority");
}

export async function parseIntent(
  message: string,
  history: ChatTurn[] = [],
): Promise<Intent> {
  let text = await requestModelIntent(message, history);

  try {
    let value = JSON.parse(stripJsonFences(text));
    let intent = validateIntent(value);

    if (intent.action === "clarify" && isSpuriousCreateClarify(intent.question)) {
      const overridePrompt = systemPrompt + "\n\nCRITICAL OVERRIDE: You MUST return a create_ticket intent immediately. Do not return clarify. Invent a title and description based on the user's message. Omit company_name, contact_name, and priority entirely.";
      text = await requestModelIntent(message, history, overridePrompt);
      value = JSON.parse(stripJsonFences(text));
      intent = validateIntent(value);
    }

    return intent;
  } catch (caughtError) {
    if (
      caughtError instanceof OpenAI.APIError &&
      caughtError.status === 429
    ) {
      throw new Error("QUOTA_EXCEEDED");
    }
    if (
      caughtError instanceof Error &&
      caughtError.message === "QUOTA_EXCEEDED"
    ) {
      throw caughtError;
    }
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
      let companyId: number | undefined | null = undefined;
      if (intent.company_name) {
        if (intent.company_name.toLowerCase() === "unassigned" || intent.company_name.toLowerCase() === "none" || intent.company_name.toLowerCase() === "null") {
          companyId = null;
        } else {
          const company = findCompanyByName(intent.company_name);
          if (!company) {
            return { type: "clarify", question: `Which company did you mean by "${intent.company_name}"?` };
          }
          companyId = company.id;
        }
      }

      let contactId: number | undefined | null = undefined;
      if (intent.contact_name) {
        if (intent.contact_name.toLowerCase() === "unassigned" || intent.contact_name.toLowerCase() === "none" || intent.contact_name.toLowerCase() === "null") {
          contactId = null;
        } else {
          // If we resolved a companyId above, we can filter by it, otherwise look globally
          const availableContacts = companyId 
            ? contactService.getAll().filter(c => c.company_id === companyId)
            : contactService.getAll();
          
          const contact = findContactByName(availableContacts, intent.contact_name);
          if (!contact) {
            return { type: "clarify", question: `Which contact did you mean by "${intent.contact_name}"?` };
          }
          contactId = contact.id;
        }
      }

      const ticket = ticketService.update(intent.ticket_id, {
        ...(intent.title ? { title: intent.title } : {}),
        ...(intent.description ? { description: intent.description } : {}),
        ...(intent.status ? { status: intent.status } : {}),
        ...(intent.priority ? { priority: intent.priority } : {}),
        ...(companyId !== undefined ? { company_id: companyId } : {}),
        ...(contactId !== undefined ? { contact_id: contactId } : {}),
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

    case "create_company": {
      const company = companyService.create({
        name: intent.name,
        domain: intent.domain ?? "example.com",
        plan: intent.plan ?? "Basic",
      });
      return { type: "action", action: "created", company };
    }

    case "update_company": {
      const company = companyService.update(intent.company_id, {
        ...(intent.name ? { name: intent.name } : {}),
        ...(intent.domain ? { domain: intent.domain } : {}),
        ...(intent.plan ? { plan: intent.plan } : {}),
      });
      if (!company) {
        return { type: "clarify", question: `Company ID ${intent.company_id} not found. Which company to update?` };
      }
      return { type: "action", action: "updated", company };
    }

    case "delete_company": {
      const deleted = companyService.delete(intent.company_id);
      if (!deleted) {
        return { type: "clarify", question: `Company ID ${intent.company_id} not found.` };
      }
      return { type: "action", action: "deleted", company_id: intent.company_id };
    }

    case "list_companies": {
      let companies = companyService.getAll();
      if (intent.name) {
        const normalized = intent.name.toLowerCase();
        companies = companies.filter(c => c.name.toLowerCase().includes(normalized));
      }
      return { type: "list", mode: intent.mode ?? "list", companies };
    }

    case "create_contact": {
      let companyId: number | null = null;
      if (intent.company_name) {
        const company = findCompanyByName(intent.company_name);
        if (!company) {
          return { type: "clarify", question: `Which company did you mean by "${intent.company_name}"?` };
        }
        companyId = company.id;
      }
      const contact = contactService.create({
        name: intent.name,
        email: intent.email ?? "placeholder@example.com",
        phone: intent.phone ?? "+1 000 000 0000",
        company_id: companyId,
      });
      return { type: "action", action: "created", contact };
    }

    case "update_contact": {
      let companyId: number | undefined | null = undefined;
      if (intent.company_name) {
        if (intent.company_name.toLowerCase() === "unassigned" || intent.company_name.toLowerCase() === "none") {
          companyId = null;
        } else {
          const company = findCompanyByName(intent.company_name);
          if (!company) {
            return { type: "clarify", question: `Which company did you mean by "${intent.company_name}"?` };
          }
          companyId = company.id;
        }
      }

      const contact = contactService.update(intent.contact_id, {
        ...(intent.name ? { name: intent.name } : {}),
        ...(intent.email ? { email: intent.email } : {}),
        ...(intent.phone ? { phone: intent.phone } : {}),
        ...(companyId !== undefined ? { company_id: companyId } : {}),
      });

      if (!contact) {
        return { type: "clarify", question: `Contact ID ${intent.contact_id} not found.` };
      }
      return { type: "action", action: "updated", contact };
    }

    case "delete_contact": {
      const deleted = contactService.delete(intent.contact_id);
      if (!deleted) {
        return { type: "clarify", question: `Contact ID ${intent.contact_id} not found.` };
      }
      return { type: "action", action: "deleted", contact_id: intent.contact_id };
    }

    case "list_contacts": {
      let contacts = contactService.getAll();
      if (intent.name) {
        const normalized = intent.name.toLowerCase();
        contacts = contacts.filter(c => c.name.toLowerCase().includes(normalized));
      }
      if (intent.company_name) {
        const company = findCompanyByName(intent.company_name);
        if (!company) {
          return { type: "clarify", question: `Which company did you mean by "${intent.company_name}"?` };
        }
        contacts = contacts.filter(c => c.company_id === company.id);
      }
      return { type: "list", mode: intent.mode ?? "list", contacts };
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
