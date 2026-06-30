import { useMemo } from "react";

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";

import type { Company } from "./types";

type CompanyTableProps = {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (company: Company) => void;
};

const columnHelper = createColumnHelper<Company>();

function getPlanTone(plan: string) {
  const normalizedPlan = plan.toLowerCase();

  if (normalizedPlan.includes("enterprise")) {
    return "purple";
  }

  if (normalizedPlan.includes("business")) {
    return "blue";
  }

  return "green";
}

export function CompanyTable({ companies, onEdit, onDelete }: CompanyTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span className="font-medium text-neutral-950">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("domain", {
        header: "Domain",
      }),
      columnHelper.accessor("plan", {
        header: "Plan",
        cell: (info) => <Badge tone={getPlanTone(info.getValue())}>{info.getValue()}</Badge>,
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
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <Table table={table} />;
}
