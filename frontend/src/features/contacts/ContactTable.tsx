import { useMemo } from "react";

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Table } from "@/components/ui/Table";

import type { Contact } from "./types";

type ContactTableProps = {
  contacts: Contact[];
};

const columnHelper = createColumnHelper<Contact>();

export function ContactTable({ contacts }: ContactTableProps) {
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
      columnHelper.accessor((row) => row.company.name, {
        id: "company",
        header: "Company",
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <Table table={table} />;
}
