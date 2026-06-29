import { db } from "../db/database";
import type { Company, CreateCompanyInput, EntityId, UpdateCompanyInput } from "../types";

const companyColumns = "id, name, domain, plan, created_at";

function getCompanyById(id: EntityId): Company | undefined {
  return db
    .prepare(`SELECT ${companyColumns} FROM companies WHERE id = ?`)
    .get(id) as Company | undefined;
}

export const companyService = {
  getAll(): Company[] {
    return db
      .prepare(`SELECT ${companyColumns} FROM companies ORDER BY name ASC`)
      .all() as Company[];
  },

  getById(id: EntityId): Company | undefined {
    return getCompanyById(id);
  },

  create(data: CreateCompanyInput): Company {
    const result = db
      .prepare(
        `
          INSERT INTO companies (name, domain, plan)
          VALUES (@name, @domain, @plan)
        `,
      )
      .run(data);

    return getCompanyById(Number(result.lastInsertRowid)) as Company;
  },

  update(id: EntityId, data: UpdateCompanyInput): Company | undefined {
    const fields: Array<keyof UpdateCompanyInput> = ["name", "domain", "plan"];
    const updates = fields
      .filter((field) => data[field] !== undefined)
      .map((field) => `${field} = @${field}`);

    if (updates.length > 0) {
      db.prepare(`UPDATE companies SET ${updates.join(", ")} WHERE id = @id`).run({
        id,
        ...data,
      });
    }

    return getCompanyById(id);
  },
};
