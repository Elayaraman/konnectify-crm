import { create } from "zustand";

import type { Company, Contact, CRMView, Ticket } from "@/types";

type CRMStore = {
  tickets: Ticket[];
  contacts: Contact[];
  companies: Company[];
  currentView: CRMView;
  setTickets: (tickets: Ticket[]) => void;
  setContacts: (contacts: Contact[]) => void;
  setCompanies: (companies: Company[]) => void;
  setCurrentView: (view: CRMView) => void;
  addTicket: (ticket: Ticket) => void;
  updateTicket: (ticket: Ticket) => void;
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  addCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
};

export const useCRMStore = create<CRMStore>((set) => ({
  tickets: [],
  contacts: [],
  companies: [],
  currentView: "tickets",
  setTickets: (tickets) => set({ tickets }),
  setContacts: (contacts) => set({ contacts }),
  setCompanies: (companies) => set({ companies }),
  setCurrentView: (currentView) => set({ currentView }),
  addTicket: (ticket) =>
    set((state) => ({
      tickets: [ticket, ...state.tickets],
    })),
  updateTicket: (ticket) =>
    set((state) => ({
      tickets: state.tickets.map((item) => (item.id === ticket.id ? ticket : item)),
    })),
  addContact: (contact) =>
    set((state) => ({
      contacts: [contact, ...state.contacts],
    })),
  updateContact: (contact) =>
    set((state) => ({
      contacts: state.contacts.map((item) =>
        item.id === contact.id ? contact : item,
      ),
    })),
  addCompany: (company) =>
    set((state) => ({
      companies: [company, ...state.companies],
    })),
  updateCompany: (company) =>
    set((state) => ({
      companies: state.companies.map((item) =>
        item.id === company.id ? company : item,
      ),
    })),
}));
