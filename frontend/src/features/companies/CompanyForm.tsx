import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCRMStore } from "@/store/useCRMStore";
import type { Company } from "@/types";

import { createCompany, updateCompany } from "./api";

type CompanyFormProps = {
  open: boolean;
  onClose: () => void;
  company?: Company;
};

export function CompanyForm({ open, onClose, company }: CompanyFormProps) {
  const addCompanyToStore = useCRMStore((state) => state.addCompany);
  const updateCompanyInStore = useCRMStore((state) => state.updateCompany);

  const [name, setName] = useState(company?.name ?? "");
  const [domain, setDomain] = useState(company?.domain ?? "");
  const [plan, setPlan] = useState(company?.plan ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = company !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing) {
        const updated = await updateCompany(company.id, { name, domain, plan });
        updateCompanyInStore(updated);
      } else {
        const created = await createCompany({ name, domain, plan });
        addCompanyToStore(created);
      }

      onClose();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save company.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      open={open}
      title={isEditing ? "Edit Company" : "New Company"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Name"
          name="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Company name"
          required
          value={name}
        />
        <Input
          label="Domain"
          name="domain"
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          required
          value={domain}
        />
        <Input
          label="Plan"
          name="plan"
          onChange={(e) => setPlan(e.target.value)}
          placeholder="Business, Enterprise, Scale..."
          required
          value={plan}
        />
        {errorMessage ? (
          <p className="text-sm text-red-600">{errorMessage}</p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
