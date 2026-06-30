import { Router } from "express";

import { companyService } from "../services/company.service";
import type { CreateCompanyInput, EntityId, UpdateCompanyInput } from "../types";
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
  key: keyof UpdateCompanyInput,
): string | null | undefined {
  const value = body[key];

  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseIdParam(value: string): EntityId | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseCreateCompany(body: unknown): ParseResult<CreateCompanyInput> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const name = readRequiredString(record, "name");
  const domain = readRequiredString(record, "domain");
  const plan = readRequiredString(record, "plan");

  if (!name || !domain || !plan) {
    return {
      ok: false,
      message: "Company name, domain, and plan are required.",
    };
  }

  return { ok: true, value: { name, domain, plan } };
}

function parseUpdateCompany(body: unknown): ParseResult<UpdateCompanyInput> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const updates: UpdateCompanyInput = {};
  const name = readOptionalString(record, "name");
  const domain = readOptionalString(record, "domain");
  const plan = readOptionalString(record, "plan");

  if (name === null || domain === null || plan === null) {
    return {
      ok: false,
      message: "Company update fields must be non-empty strings.",
    };
  }

  if (name !== undefined) {
    updates.name = name;
  }

  if (domain !== undefined) {
    updates.domain = domain;
  }

  if (plan !== undefined) {
    updates.plan = plan;
  }

  if (Object.keys(updates).length === 0) {
    return {
      ok: false,
      message: "At least one company field is required for update.",
    };
  }

  return { ok: true, value: updates };
}

router.get("/", (_req, res) => {
  try {
    return success(res, companyService.getAll());
  } catch (caughtError) {
    return error(
      res,
      "Failed to fetch companies.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.get("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Company id must be a positive integer.", 400);
  }

  try {
    const company = companyService.getById(id);

    if (!company) {
      return error(res, "Company not found.", 404);
    }

    return success(res, company);
  } catch (caughtError) {
    return error(
      res,
      "Failed to fetch company.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.post("/", (req, res) => {
  const parsed = parseCreateCompany(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    return success(res, companyService.create(parsed.value), 201);
  } catch (caughtError) {
    return error(
      res,
      "Failed to create company.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.patch("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Company id must be a positive integer.", 400);
  }

  const parsed = parseUpdateCompany(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    const company = companyService.update(id, parsed.value);

    if (!company) {
      return error(res, "Company not found.", 404);
    }

    return success(res, company);
  } catch (caughtError) {
    return error(
      res,
      "Failed to update company.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

router.delete("/:id", (req, res) => {
  const id = parseIdParam(req.params.id);

  if (!id) {
    return error(res, "Company id must be a positive integer.", 400);
  }

  try {
    const deleted = companyService.delete(id);

    if (!deleted) {
      return error(res, "Company not found.", 404);
    }

    return success(res, { id });
  } catch (caughtError) {
    return error(
      res,
      "Failed to delete company.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

export default router;
