import { Router } from "express";

import { executeIntent, parseIntent } from "../services/copilot.service";
import { error, success } from "../utils/response";

type BodyRecord = Record<string, unknown>;
type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const router = Router();

function asBodyRecord(body: unknown): BodyRecord | null {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as BodyRecord)
    : null;
}

function parseMessage(body: unknown): ParseResult<string> {
  const record = asBodyRecord(body);

  if (!record) {
    return { ok: false, message: "Request body must be an object." };
  }

  const message = record.message;

  if (typeof message !== "string" || message.trim().length === 0) {
    return { ok: false, message: "Message is required." };
  }

  return { ok: true, value: message.trim() };
}

router.post("/", async (req, res) => {
  const parsed = parseMessage(req.body);

  if (!parsed.ok) {
    return error(res, parsed.message, 400);
  }

  try {
    const intent = await parseIntent(parsed.value);
    const result = await executeIntent(intent);

    return success(res, result);
  } catch (caughtError) {
    return error(
      res,
      "Copilot failed to process the request.",
      500,
      caughtError instanceof Error ? caughtError.message : undefined,
    );
  }
});

export default router;
