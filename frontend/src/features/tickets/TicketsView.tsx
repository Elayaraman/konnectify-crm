import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { useCRMStore } from "@/store/useCRMStore";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/types";
import type { TicketPriority, TicketStatus } from "@/types";

import { getTickets } from "./api";
import { TicketTable } from "./TicketTable";

type StatusFilter = TicketStatus | "";
type PriorityFilter = TicketPriority | "";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TicketsView() {
  const tickets = useCRMStore((state) => state.tickets);
  const setTickets = useCRMStore((state) => state.setTickets);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("");

  const loadTickets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getTickets();
      setTickets(data);
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load tickets.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [setTickets]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    const query = normalize(search);

    return tickets.filter((ticket) => {
      const matchesSearch =
        query.length === 0 ||
        normalize(
          [
            ticket.title,
            ticket.description,
            ticket.company.name,
            ticket.contact.name,
          ].join(" "),
        ).includes(query);

      const matchesStatus =
        statusFilter.length === 0 || ticket.status === statusFilter;
      const matchesPriority =
        priorityFilter.length === 0 || ticket.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, search, statusFilter, tickets]);

  const hasActiveFilters =
    search.trim().length > 0 || statusFilter.length > 0 || priorityFilter.length > 0;

  if (isLoading) {
    return <Loading title="Loading tickets" />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadTickets} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          CRM
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
          Tickets
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Track customer issues, ownership context, and resolution priority.
        </p>
      </div>

      <Card
        description="Search locally and narrow the queue by status or priority."
        title="Ticket queue"
      >
        <div className="grid gap-3 border-b border-neutral-100 px-5 py-4 md:grid-cols-[1fr_180px_180px_auto]">
          <Input
            aria-label="Search tickets"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tickets, companies, contacts..."
            value={search}
          />
          <select
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            value={statusFilter}
          >
            <option value="">All statuses</option>
            {TICKET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            onChange={(event) =>
              setPriorityFilter(event.target.value as PriorityFilter)
            }
            value={priorityFilter}
          >
            <option value="">All priorities</option>
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatLabel(priority)}
              </option>
            ))}
          </select>
          <Button
            disabled={!hasActiveFilters}
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setPriorityFilter("");
            }}
            variant="secondary"
          >
            Clear
          </Button>
        </div>
        <div className="p-5">
          {tickets.length === 0 ? (
            <EmptyState
              description="Seed data should appear here once the backend is running."
              title="No tickets yet"
            />
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              description="Adjust the search query or filters to see more records."
              title="No tickets match your filters"
            />
          ) : (
            <TicketTable tickets={filteredTickets} />
          )}
        </div>
      </Card>
    </div>
  );
}
