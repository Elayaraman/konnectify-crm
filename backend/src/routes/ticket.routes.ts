import { Router } from "express";

import { ticketService } from "../services/ticket.service";
import type {
  CreateTicketInput,
  EntityId,
  TicketFilters,
  TicketPriority,
  TicketStatus,
  UpdateTicketInput,
} from "../types";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../types";
import { error, success } from "../utils/response";

type BodyRecord = Record<string, unknown>;
type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const router = Router();

function asBodyRecord(body: unknown): BodyRecord | null {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as BodyRecord)
    : null;
}

function readRequiredString(body: BodyRecord, key: string): string | null {
  const value = body[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readOptionalString(
  body: BodyRecord,
  key: keyof UpdateTicketInput,
): string | null | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseEntityId(value: unknown): EntityId | null {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  return Number.isInteger(id) && id > 0 ? id : null;
}

function readRequiredId(body: BodyRecord, key: string): EntityId | null {
  return parseEntityId(body[key]);
}

function readOptionalId(
  body: BodyRecord,
  key: keyof UpdateTicketInput,
): EntityId | null | undefined {
  const value = body[key];
  return value === undefined ? undefined : parseEntityId(value);
}

function parseIdParam(value: string): EntityId | null {
  return parseEntityId(value);
}

function isTicketStatus(value: string): value is TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus);
}

function isTicketPriority(value: string): value is TicketPriority {
  return TICKET_PRIORITIES.includes(value as TicketPriority);
}

function readRequiredStatus(body: BodyRecord): TicketStatus | null {
  const value = body.status;
  return typeof value === "string" && isTicketStatus(value) ? value : null;
}

function readOptionalStatus(
  body: BodyRecord,
): TicketStatus | null | undefined {
  const value = body.status;
  return value === undefined
    ? undefined
    : typeof value === "string" && isTicketStatus(value)
      ? value
      : null;
}

function readRequiredPriority(body: BodyRecord): TicketPriority | null {
  const value = body.priority;
  return typeof value === "string" && isTicketPriority(value) ? value : null;
}

function readOptionalPriority(
  body: BodyRecord,
): TicketPriority | null | undefined {
  const value = body.priority;
  return value === undefined
    ? undefined
    : typeof value === "string" && isTicketPriority(value)
      ? value
      : null;
}

function parseCreateTicket(body: unknown): ParseResult<CreateTicketInput> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const title = readRequiredString(record, "title");
  const description = readRequiredString(record, "description");
  const status = readRequiredStatus(record);
  const priority = readRequiredPriority(record);
  const contactId = readRequiredId(record, "contact_id");
  const companyId = readRequiredId(record, "company_id");

  if (!title || !description || !status || !priority || !contactId || !companyId) {
    return {
      ok: false,
      message:
        "Ticket title, description, status, priority, contact_id, and company_id are required.",
    };
  }

  return {
    ok: true,
    value: {
      title,
      description,
      status,
      priority,
      contact_id: contactId,
      company_id: companyId,
    },
  };
}

function parseUpdateTicket(body: unknown): ParseResult<UpdateTicketInput> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const updates: UpdateTicketInput = {};
  const title = readOptionalString(record, "title");
  const description = readOptionalString(record, "description");
  const status = readOptionalStatus(record);
  const priority = readOptionalPriority(record);
  const contactId = readOptionalId(record, "contact_id");
  const companyId = readOptionalId(record, "company_id");

  if (
    title === null ||
    description === null ||
    status === null ||
    priority === null ||
    contactId === null ||
    companyId === null
  ) {
    return {
      ok: false,
      message: "Ticket update fields must be valid non-empty values.",
    };
  }

  if (title !== undefined) {
    updates.title = title;
  }

  if (description !== undefined) {
    updates.description = description;
  }

  if (status !== undefined) {
    updates.status = status;
  }

  if (priority !== undefined) {
    updates.priority = priority;
  }

  if (contactId !== undefined) {
    updates.contact_id = contactId;
  }

  if (companyId !== undefined) {
    updates.company_id = companyId;
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      message: "At least one ticket field is required for update.",
    };
  }

  return { ok: true, value: updates };
}

function readSingleQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function parseFilters(query: BodyRecord): ParseResult<TicketFilters> {
  const statusValue = readSingleQueryValue(query.status);
  const priorityValue = readSingleQueryValue(query.priority);
  const companyIdValue = readSingleQueryValue(query.company_id);
  const filters: TicketFilters = {};

  if (statusValue) {
    if (!isTicketStatus(statusValue)) {
      return { ok: false, message: "Invalid ticket status filter." };
    }

    filters.status = statusValue;
  }

  if (priorityValue) {
    if (!isTicketPriority(priorityValue)) {
      return { ok: false, message: "Invalid ticket priority filter." };
    }

    filters.priority = priorityValue;
  }

  if (companyIdValue) {
    const companyId = parseEntityId(companyIdValue);

    if (!companyId) {
      return { ok: false, message: "company_id filter must be a positive integer." };
    }

    filters.company_id = companyId;
  }

  return { ok: true, value: filters };
}

router.get("/", (req, res) => {
  const parsedFilters = parseFilters(req.query);

  if (!parsedFilters.ok) {
    return error(res, parsedFilters.message, 400);
  }

  try {
    return success(res, ticketService.getAll(parsedFilters.value));
  } catch (caughtError) {
    return error(
      res,
      "Failed to fetch tickets.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.get("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Ticket id must be a positive integer.", 400);
  }

  try {
    const ticket = ticketService.getById(id);

    if (!ticket) {
      return error(res, "Ticket not found.", 404);
    }

    return success(res, ticket);
  } catch (caughtError) {
    return error(
      res,
      "Failed to fetch ticket.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.post("/", (req, res) => {
  const parsed = parseCreateTicket(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    return success(res, ticketService.create(parsed.value), 201);
  } catch (caughtError) {
    return error(
      res,
      "Failed to create ticket.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.patch("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Ticket id must be a positive integer.", 400);
  }

  const parsed = parseUpdateTicket(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    const ticket = ticketService.update(id, parsed.value);

    if (!ticket) {
      return error(res, "Ticket not found.", 404);
    }

    return success(res, ticket);
  } catch (caughtError) {
    return error(
      res,
      "Failed to update ticket.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.delete("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Ticket id must be a positive integer.", 400);
  }

  try {
    const deleted = ticketService.delete(id);

    if (!deleted) {
      return error(res, "Ticket not found.", 404);
    }

    return success(res, { id });
  } catch (caughtError) {
    return error(
      res,
      "Failed to delete ticket.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

export default router;
