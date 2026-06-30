export const TICKET_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type EntityId = number;
export type Timestamp = string;
export type CRMView = "tickets" | "contacts" | "companies";
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export type CompanySummary = {
  id: EntityId;
  name: string;
};

export type ContactSummary = {
  id: EntityId;
  name: string;
};

export type Company = {
  id: EntityId;
  name: string;
  domain: string;
  plan: string;
  created_at: Timestamp;
};

export type Contact = {
  id: EntityId;
  name: string;
  email: string;
  phone: string;
  company_id: EntityId | null;
  created_at: Timestamp;
  company: CompanySummary | null;
};

export type Ticket = {
  id: EntityId;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: Timestamp;
  updated_at: Timestamp;
  company: CompanySummary | null;
  contact: ContactSummary | null;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};
