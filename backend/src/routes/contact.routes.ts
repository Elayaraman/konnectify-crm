import { Router } from "express";

import { contactService } from "../services/contact.service";
import type { CreateContactInput, EntityId, UpdateContactInput } from "../types";
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
  key: keyof UpdateContactInput,
): string | null | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readRequiredId(body: BodyRecord, key: string): EntityId | null {
  return parseEntityId(body[key]);
}

function readOptionalId(
  body: BodyRecord,
  key: keyof UpdateContactInput,
): EntityId | null | undefined {
  const value = body[key];
  return value === undefined ? undefined : parseEntityId(value);
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

function parseIdParam(value: string): EntityId | null {
  return parseEntityId(value);
}

function parseCreateContact(body: unknown): ParseResult<CreateContactInput> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const name = readRequiredString(record, "name");
  const email = readRequiredString(record, "email");
  const phone = readRequiredString(record, "phone");
  const companyId = readRequiredId(record, "company_id");

  if (!name || !email || !phone || !companyId) {
    return {
      ok: false,
      message: "Contact name, email, phone, and company_id are required.",
    };
  }

  return {
    ok: true,
    value: { name, email, phone, company_id: companyId },
  };
}

function parseUpdateContact(body: unknown): ParseResult<UpdateContactInput> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const updates: UpdateContactInput = {};
  const name = readOptionalString(record, "name");
  const email = readOptionalString(record, "email");
  const phone = readOptionalString(record, "phone");
  const companyId = readOptionalId(record, "company_id");

  if (name === null || email === null || phone === null || companyId === null) {
    return {
      ok: false,
      message: "Contact update fields must be valid non-empty values.",
    };
  }

  if (name !== undefined) {
    updates.name = name;
  }

  if (email !== undefined) {
    updates.email = email;
  }

  if (phone !== undefined) {
    updates.phone = phone;
  }

  if (companyId !== undefined) {
    updates.company_id = companyId;
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      message: "At least one contact field is required for update.",
    };
  }

  return { ok: true, value: updates };
}

router.get("/", (_req, res) => {
  try {
    return success(res, contactService.getAll());
  } catch (caughtError) {
    return error(
      res,
      "Failed to fetch contacts.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.get("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Contact id must be a positive integer.", 400);
  }

  try {
    const contact = contactService.getById(id);

    if (!contact) {
      return error(res, "Contact not found.", 404);
    }

    return success(res, contact);
  } catch (caughtError) {
    return error(
      res,
      "Failed to fetch contact.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.post("/", (req, res) => {
  const parsed = parseCreateContact(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    return success(res, contactService.create(parsed.value), 201);
  } catch (caughtError) {
    return error(
      res,
      "Failed to create contact.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.patch("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Contact id must be a positive integer.", 400);
  }

  const parsed = parseUpdateContact(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    const contact = contactService.update(id, parsed.value);

    if (!contact) {
      return error(res, "Contact not found.", 404);
    }

    return success(res, contact);
  } catch (caughtError) {
    return error(
      res,
      "Failed to update contact.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

export default router;
