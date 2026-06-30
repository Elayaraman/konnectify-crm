import { CompaniesView } from "@/features/companies/CompaniesView";
import { getCompanies } from "@/features/companies/api";
import { ContactsView } from "@/features/contacts/ContactsView";
import { getContacts } from "@/features/contacts/api";
import { TicketsView } from "@/features/tickets/TicketsView";
import { MainLayout } from "@/layouts/MainLayout";
import { useCRMStore } from "@/store/useCRMStore";
import { useEffect } from "react";

export function App() {
  const currentView = useCRMStore((state) => state.currentView);
  const setCompanies = useCRMStore((state) => state.setCompanies);
  const setContacts = useCRMStore((state) => state.setContacts);

  useEffect(() => {
    Promise.all([
      getCompanies().then(setCompanies).catch(() => {}),
      getContacts().then(setContacts).catch(() => {}),
    ]);
  }, [setCompanies, setContacts]);

  const view =
    currentView === "tickets" ? (
      <TicketsView />
    ) : currentView === "contacts" ? (
      <ContactsView />
    ) : (
      <CompaniesView />
    );

  return <MainLayout>{view}</MainLayout>;
}
