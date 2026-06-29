import { db } from "../db/database";
import type {
  ContactWithCompany,
  CreateContactInput,
  EntityId,
  UpdateContactInput,
} from "../types";

type ContactRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company_id: number;
  created_at: string;
  company_name: string;
};

const contactSelect = `
  SELECT
    contacts.id,
    contacts.name,
    contacts.email,
    contacts.phone,
    contacts.company_id,
    contacts.created_at,
    companies.name AS company_name
  FROM contacts
  INNER JOIN companies ON companies.id = contacts.company_id
`;

function toContact(row: ContactRow): ContactWithCompany {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company_id: row.company_id,
    created_at: row.created_at,
    company: {
      id: row.company_id,
      name: row.company_name,
    },
  };
}

function getContactById(id: EntityId): ContactWithCompany | undefined {
  const row = db
    .prepare(`${contactSelect} WHERE contacts.id = ?`)
    .get(id) as ContactRow | undefined;

  return row ? toContact(row) : undefined;
}

export const contactService = {
  getAll(): ContactWithCompany[] {
    const rows = db
      .prepare(`${contactSelect} ORDER BY contacts.name ASC`)
      .all() as ContactRow[];

    return rows.map(toContact);
  },

  getById(id: EntityId): ContactWithCompany | undefined {
    return getContactById(id);
  },

  create(data: CreateContactInput): ContactWithCompany {
    const result = db
      .prepare(
        `
          INSERT INTO contacts (name, email, phone, company_id)
          VALUES (@name, @email, @phone, @company_id)
        `,
      )
      .run(data);

    return getContactById(Number(result.lastInsertRowid)) as ContactWithCompany;
  },

  update(id: EntityId, data: UpdateContactInput): ContactWithCompany | undefined {
    const fields: Array<keyof UpdateContactInput> = [
      "name",
      "email",
      "phone",
      "company_id",
    ];
    const updates = fields
      .filter((field) => data[field] !== undefined)
      .map((field) => `${field} = @${field}`);

    if (updates.length > 0) {
      db.prepare(`UPDATE contacts SET ${updates.join(", ")} WHERE id = @id`).run({
        id,
        ...data,
      });
    }

    return getContactById(id);
  },
};
