import { useMemo } from "react";

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";

import type { Contact } from "./types";

type ContactTableProps = {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
};

const columnHelper = createColumnHelper<Contact>();

export function ContactTable({ contacts, onEdit, onDelete }: ContactTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span className="font-medium text-neutral-950">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: "Email",
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
      }),
      columnHelper.accessor((row) => row.company?.name, {
        id: "company",
        header: "Company",
        cell: (info) => info.getValue() ?? <Badge tone="neutral">Unassigned</Badge>,
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
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <Table table={table} />;
}
