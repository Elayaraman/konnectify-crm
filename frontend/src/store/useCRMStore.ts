import { create } from "zustand";

import type { Company, Contact, CRMView, EntityId, Ticket } from "@/types";

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
  removeTicket: (id: EntityId) => void;
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  removeContact: (id: EntityId) => void;
  addCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
  removeCompany: (id: EntityId) => void;
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
  removeTicket: (id) =>
    set((state) => ({
      tickets: state.tickets.filter((item) => item.id !== id),
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
  removeContact: (id) =>
    set((state) => ({
      contacts: state.contacts.filter((item) => item.id !== id),
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
  removeCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((item) => item.id !== id),
    })),
}));
