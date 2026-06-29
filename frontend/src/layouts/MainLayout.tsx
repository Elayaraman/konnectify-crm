import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { Copilot } from "@/features/copilot/Copilot";
import { useCRMStore } from "@/store/useCRMStore";
import type { CRMView } from "@/types";

type MainLayoutProps = {
  children: ReactNode;
};

const navigationItems: Array<{ label: string; value: CRMView }> = [
  { label: "Tickets", value: "tickets" },
  { label: "Contacts", value: "contacts" },
  { label: "Companies", value: "companies" },
];

export function MainLayout({ children }: MainLayoutProps) {
  const currentView = useCRMStore((state) => state.currentView);
  const setCurrentView = useCRMStore((state) => state.setCurrentView);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)_340px]">
        <aside className="border-r border-neutral-200 bg-white px-4 py-5">
          <div className="mb-8">
            <p className="text-sm font-semibold tracking-tight text-neutral-950">
              Konnectify
            </p>
            <p className="mt-1 text-xs text-neutral-500">CRM workspace</p>
          </div>
          <nav className="space-y-1" aria-label="Main navigation">
            {navigationItems.map((item) => (
              <Button
                className="w-full justify-start"
                key={item.value}
                onClick={() => setCurrentView(item.value)}
                variant={currentView === item.value ? "secondary" : "ghost"}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 px-8 py-6">{children}</main>
        <Copilot />
      </div>
    </div>
  );
}
