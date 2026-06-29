import { useMemo } from "react";

import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";

import type { Company } from "./types";

type CompanyTableProps = {
  companies: Company[];
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

export function CompanyTable({ companies }: CompanyTableProps) {
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
    ],
    [],
  );

  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return <Table table={table} />;
}
