import { CompaniesView } from "@/features/companies/CompaniesView";
import { ContactsView } from "@/features/contacts/ContactsView";
import { TicketsView } from "@/features/tickets/TicketsView";
import { MainLayout } from "@/layouts/MainLayout";
import { useCRMStore } from "@/store/useCRMStore";

export function App() {
  const currentView = useCRMStore((state) => state.currentView);

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
