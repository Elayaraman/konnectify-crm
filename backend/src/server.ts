import "dotenv/config";

import express from "express";
import type { NextFunction, Request, Response } from "express";

import copilotRoutes from "./routes/copilot.routes";
import companyRoutes from "./routes/company.routes";
import contactRoutes from "./routes/contact.routes";
import ticketRoutes from "./routes/ticket.routes";
import { error, success } from "./utils/response";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "127.0.0.1";
const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());

app.get("/api/health", (_req, res) => {
  return success(res, {
    name: "Konnectify CRM API",
    status: "ok",
  });
});

app.use("/api/tickets", ticketRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/copilot", copilotRoutes);

app.use((_req, res) => {
  return error(res, "Route not found.", 404);
});

app.use((caughtError: unknown, _req: Request, res: Response, _next: NextFunction) => {
  return error(
    res,
    "Unexpected server error.",
    500,
    caughtError instanceof Error ? caughtError.message : undefined,
  );
});

app.listen(port, host, () => {
  console.log(`Konnectify CRM API listening on http://${host}:${port}`);
});
