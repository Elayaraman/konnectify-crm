import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const backendRoot = path.resolve(__dirname, "../..");
const dataDirectory = path.join(backendRoot, "data");
const databasePath =
  process.env.DATABASE_PATH ?? path.join(dataDirectory, "konnectify.db");

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

type SeedCompany = {
  name: string;
  domain: string;
  plan: string;
  contacts: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  tickets: Array<{
    title: string;
    description: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    priority: "low" | "medium" | "high" | "urgent";
    contactIndex: number;
  }>;
};

const seedCompanies: SeedCompany[] = [
  {
    name: "Rapido",
    domain: "rapido.bike",
    plan: "Business",
    contacts: [
      {
        name: "Aarav Menon",
        email: "aarav.menon@rapido.bike",
        phone: "+91 98765 10001",
      },
      {
        name: "Nisha Rao",
        email: "nisha.rao@rapido.bike",
        phone: "+91 98765 10002",
      },
    ],
    tickets: [
      {
        title: "Delayed rider payout sync",
        description:
          "Finance dashboard is showing delayed payout status for a subset of riders.",
        status: "open",
        priority: "high",
        contactIndex: 0,
      },
      {
        title: "Webhook retry configuration",
        description:
          "Operations team needs confirmation that failed trip webhooks retry correctly.",
        status: "in_progress",
        priority: "medium",
        contactIndex: 1,
      },
      {
        title: "Monthly SLA report export",
        description:
          "Customer success requested a clean export of uptime and response metrics.",
        status: "resolved",
        priority: "low",
        contactIndex: 0,
      },
    ],
  },
  {
    name: "Airbus",
    domain: "airbus.com",
    plan: "Enterprise",
    contacts: [
      {
        name: "Claire Dubois",
        email: "claire.dubois@airbus.com",
        phone: "+33 1 42 68 1001",
      },
      {
        name: "Thomas Meyer",
        email: "thomas.meyer@airbus.com",
        phone: "+49 40 743 1002",
      },
    ],
    tickets: [
      {
        title: "SSO metadata rotation",
        description:
          "Security team needs updated SAML metadata before the next certificate rotation.",
        status: "in_progress",
        priority: "urgent",
        contactIndex: 0,
      },
      {
        title: "Regional data residency review",
        description:
          "Legal team requested confirmation for EU data processing controls.",
        status: "open",
        priority: "high",
        contactIndex: 1,
      },
      {
        title: "Quarterly admin training",
        description:
          "Enablement session for new workspace administrators has been completed.",
        status: "closed",
        priority: "medium",
        contactIndex: 0,
      },
    ],
  },
  {
    name: "Hotstar",
    domain: "hotstar.com",
    plan: "Scale",
    contacts: [
      {
        name: "Rohan Iyer",
        email: "rohan.iyer@hotstar.com",
        phone: "+91 98765 20001",
      },
      {
        name: "Meera Kapoor",
        email: "meera.kapoor@hotstar.com",
        phone: "+91 98765 20002",
      },
    ],
    tickets: [
      {
        title: "Spike in failed billing events",
        description:
          "Subscription renewals failed above baseline during the evening traffic peak.",
        status: "open",
        priority: "urgent",
        contactIndex: 1,
      },
      {
        title: "Segment sync field mapping",
        description:
          "Marketing operations needs help mapping user segment fields into the CRM.",
        status: "in_progress",
        priority: "medium",
        contactIndex: 0,
      },
      {
        title: "Archive legacy campaign tickets",
        description:
          "Completed campaign support tickets should be archived from active queues.",
        status: "resolved",
        priority: "low",
        contactIndex: 1,
      },
    ],
  },
];

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      company_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      contact_id INTEGER,
      company_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);
}

function seedDatabase() {
  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM companies")
    .get() as { count: number };

  if (count > 0) {
    return;
  }

  const insertCompany = db.prepare(`
    INSERT INTO companies (name, domain, plan)
    VALUES (@name, @domain, @plan)
  `);

  const insertContact = db.prepare(`
    INSERT INTO contacts (name, email, phone, company_id)
    VALUES (@name, @email, @phone, @companyId)
  `);

  const insertTicket = db.prepare(`
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
      @contactId,
      @companyId
    )
  `);

  const runSeed = db.transaction(() => {
    for (const company of seedCompanies) {
      const companyResult = insertCompany.run({
        name: company.name,
        domain: company.domain,
        plan: company.plan,
      });
      const companyId = Number(companyResult.lastInsertRowid);

      const contactIds = company.contacts.map((contact) => {
        const contactResult = insertContact.run({
          ...contact,
          companyId,
        });

        return Number(contactResult.lastInsertRowid);
      });

      for (const ticket of company.tickets) {
        insertTicket.run({
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          contactId: contactIds[ticket.contactIndex],
          companyId,
        });
      }
    }
  });

  runSeed();
}

export function initializeDatabase() {
  createSchema();
  seedDatabase();
}

initializeDatabase();
