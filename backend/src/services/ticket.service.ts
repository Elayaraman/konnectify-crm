import { db } from "../db/database";
import type {
  CreateTicketInput,
  EntityId,
  RichTicket,
  TicketFilters,
  TicketPriority,
  TicketStatus,
  UpdateTicketInput,
} from "../types";

type TicketRow = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  company_id: number;
  company_name: string;
  contact_id: number;
  contact_name: string;
};

const ticketSelect = `
  SELECT
    tickets.id,
    tickets.title,
    tickets.description,
    tickets.status,
    tickets.priority,
    tickets.created_at,
    tickets.updated_at,
    companies.id AS company_id,
    companies.name AS company_name,
    contacts.id AS contact_id,
    contacts.name AS contact_name
  FROM tickets
  LEFT JOIN companies ON companies.id = tickets.company_id
  LEFT JOIN contacts ON contacts.id = tickets.contact_id
`;

function toRichTicket(row: TicketRow): RichTicket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    created_at: row.created_at,
    updated_at: row.updated_at,
    company: row.company_id
      ? {
          id: row.company_id,
          name: row.company_name,
        }
      : null,
    contact: row.contact_id
      ? {
          id: row.contact_id,
          name: row.contact_name,
        }
      : null,
  };
}

function getTicketById(id: EntityId): RichTicket | undefined {
  const row = db
    .prepare(`${ticketSelect} WHERE tickets.id = ?`)
    .get(id) as TicketRow | undefined;

  return row ? toRichTicket(row) : undefined;
}

export const ticketService = {
  getAll(filters: TicketFilters = {}): RichTicket[] {
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    if (filters.status) {
      conditions.push("tickets.status = @status");
      params.status = filters.status;
    }

    if (filters.priority) {
      conditions.push("tickets.priority = @priority");
      params.priority = filters.priority;
    }

    if (filters.company_id) {
      conditions.push("tickets.company_id = @company_id");
      params.company_id = filters.company_id;
    }

    if (filters.unassigned_contact) {
      conditions.push("tickets.contact_id IS NULL");
    } else if (filters.contact_id) {
      conditions.push("tickets.contact_id = @contact_id");
      params.contact_id = filters.contact_id;
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
          ${ticketSelect}
          ${whereClause}
          ORDER BY tickets.updated_at DESC, tickets.id DESC
        `,
      )
      .all(params) as TicketRow[];

    return rows.map(toRichTicket);
  },

  getById(id: EntityId): RichTicket | undefined {
    return getTicketById(id);
  },

  create(data: CreateTicketInput): RichTicket {
    const result = db
      .prepare(
        `
          INSERT INTO tickets (
            title,
            description,
            status,
            priority,
            contact_id,
            company_id
          )
          VALUES (
            @title,
            @description,
            @status,
            @priority,
            @contact_id,
            @company_id
          )
        `,
      )
      .run({
        ...data,
        contact_id: data.contact_id ?? null,
        company_id: data.company_id ?? null,
      });

    return getTicketById(Number(result.lastInsertRowid)) as RichTicket;
  },

  update(id: EntityId, data: UpdateTicketInput): RichTicket | undefined {
    const fields: Array<keyof UpdateTicketInput> = [
      "title",
      "description",
      "status",
      "priority",
      "contact_id",
      "company_id",
    ];
    const updates = fields
      .filter((field) => data[field] !== undefined)
      .map((field) => `${field} = @${field}`);

    if (updates.length > 0) {
      db.prepare(
        `
          UPDATE tickets
          SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `,
      ).run({
        id,
        ...data,
      });
    }

    return getTicketById(id);
  },

  delete(id: EntityId): boolean {
    const result = db.prepare("DELETE FROM tickets WHERE id = ?").run(id);
    return result.changes > 0;
  },
};
