export type EntityId = number;
export type Timestamp = string;

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

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
  company_id: EntityId;
  created_at: Timestamp;
};

export type Ticket = {
  id: EntityId;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  contact_id: EntityId;
  company_id: EntityId;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CompanySummary = Pick<Company, "id" | "name">;
export type ContactSummary = Pick<Contact, "id" | "name">;

export type RichTicket = Omit<Ticket, "contact_id" | "company_id"> & {
  company: CompanySummary;
  contact: ContactSummary;
};

export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  company_id?: EntityId;
};

export type CreateCompanyInput = Pick<Company, "name" | "domain" | "plan">;
export type UpdateCompanyInput = Partial<CreateCompanyInput>;

export type CreateContactInput = Pick<
  Contact,
  "name" | "email" | "phone" | "company_id"
>;
export type UpdateContactInput = Partial<CreateContactInput>;

export type CreateTicketInput = Pick<
  Ticket,
  "title" | "description" | "status" | "priority" | "contact_id" | "company_id"
>;
export type UpdateTicketInput = Partial<CreateTicketInput>;

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

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
