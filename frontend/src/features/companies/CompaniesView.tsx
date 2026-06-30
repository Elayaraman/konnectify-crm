import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { useCRMStore } from "@/store/useCRMStore";
import type { Company } from "@/types";

import { deleteCompany, getCompanies } from "./api";
import { CompanyForm } from "./CompanyForm";
import { CompanyTable } from "./CompanyTable";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function CompaniesView() {
  const companies = useCRMStore((state) => state.companies);
  const setCompanies = useCRMStore((state) => state.setCompanies);
  const removeCompany = useCRMStore((state) => state.removeCompany);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | undefined>(undefined);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load companies.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [setCompanies]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const filteredCompanies = useMemo(() => {
    const query = normalize(search);

    return companies.filter((company) =>
      query.length === 0
        ? true
        : normalize([company.name, company.domain, company.plan].join(" ")).includes(
            query,
          ),
    );
  }, [companies, search]);

  function handleEdit(company: Company) {
    setEditingCompany(company);
    setIsFormOpen(true);
  }

  async function handleDelete(company: Company) {
    if (!window.confirm(`Delete company "${company.name}"?`)) {
      return;
    }

    try {
      await deleteCompany(company.id);
      removeCompany(company.id);
    } catch {
      // silently handle — user can retry
    }
  }

  function handleFormClose() {
    setIsFormOpen(false);
    setEditingCompany(undefined);
  }

  if (isLoading) {
    return <Loading title="Loading companies" />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadCompanies} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            CRM
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Companies
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Review customer accounts, domains, and subscription plans.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>New Company</Button>
      </div>

      <Card description="Search companies by account name, domain, or plan." title="Accounts">
        <div className="border-b border-neutral-100 px-5 py-4">
          <Input
            aria-label="Search companies"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies..."
            value={search}
          />
        </div>
        <div className="p-5">
          {companies.length === 0 ? (
            <EmptyState
              description="Seed companies should appear here once the backend is running."
              title="No companies yet"
            />
          ) : filteredCompanies.length === 0 ? (
            <EmptyState
              description="Try another search term to find matching companies."
              title="No companies match your search"
            />
          ) : (
            <CompanyTable
              companies={filteredCompanies}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        </div>
      </Card>

      {isFormOpen ? (
        <CompanyForm
          company={editingCompany}
          key={editingCompany?.id ?? "new"}
          onClose={handleFormClose}
          open={isFormOpen}
        />
      ) : null}
    </div>
  );
}
