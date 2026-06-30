import { useMemo } from "react";

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { TicketPriority, TicketStatus } from "@/types";

import type { Ticket } from "./types";

type TicketTableProps = {
  tickets: Ticket[];
  onEdit: (ticket: Ticket) => void;
  onDelete: (ticket: Ticket) => void;
};

const columnHelper = createColumnHelper<Ticket>();
const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusTone(status: TicketStatus) {
  const tones: Record<TicketStatus, "blue" | "green" | "neutral" | "purple"> = {
    open: "blue",
    in_progress: "purple",
    resolved: "green",
    closed: "neutral",
  };

  return tones[status];
}

function getPriorityTone(priority: TicketPriority) {
  const tones: Record<TicketPriority, "amber" | "green" | "neutral" | "red"> = {
    low: "neutral",
    medium: "green",
    high: "amber",
    urgent: "red",
  };

  return tones[priority];
}

export function TicketTable({ tickets, onEdit, onDelete }: TicketTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => (
          <div>
            <p className="font-medium text-neutral-950">{info.getValue()}</p>
            <p className="mt-1 max-w-md truncate text-xs text-neutral-500">
              {info.row.original.description}
            </p>
          </div>
        ),
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => (
          <Badge tone={getPriorityTone(info.getValue())}>
            {formatLabel(info.getValue())}
          </Badge>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Badge tone={getStatusTone(info.getValue())}>
            {formatLabel(info.getValue())}
          </Badge>
        ),
      }),
      columnHelper.accessor((row) => row.company?.name, {
        id: "company",
        header: "Company",
        cell: (info) => info.getValue() ?? <Badge tone="neutral">Unassigned</Badge>,
      }),
      columnHelper.accessor((row) => row.contact?.name, {
        id: "contact",
        header: "Contact",
        cell: (info) => info.getValue() ?? <Badge tone="neutral">Unassigned</Badge>,
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        cell: (info) => dateFormatter.format(new Date(info.getValue())),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <div className="flex gap-1">
            <Button
              onClick={() => onEdit(info.row.original)}
              size="sm"
              variant="ghost"
            >
              Edit
            </Button>
            <Button
              onClick={() => onDelete(info.row.original)}
              size="sm"
              variant="ghost"
            >
              Delete
            </Button>
          </div>
        ),
      }),
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: tickets,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <Table table={table} />;
}
