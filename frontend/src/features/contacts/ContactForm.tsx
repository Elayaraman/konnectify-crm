import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCRMStore } from "@/store/useCRMStore";
import type { Contact } from "@/types";

import { createContact, updateContact } from "./api";

type ContactFormProps = {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
};

export function ContactForm({ open, onClose, contact }: ContactFormProps) {
  const companies = useCRMStore((state) => state.companies);
  const addContactToStore = useCRMStore((state) => state.addContact);
  const updateContactInStore = useCRMStore((state) => state.updateContact);

  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [companyId, setCompanyId] = useState(
    contact?.company_id?.toString() ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = contact !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing) {
        const updated = await updateContact(contact.id, {
          name,
          email,
          phone,
          company_id: companyId ? Number(companyId) : null,
        });
        updateContactInStore(updated);
      } else {
        const created = await createContact({
          name,
          email,
          phone,
          company_id: companyId ? Number(companyId) : null,
        });
        addContactToStore(created);
      }

      onClose();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to save contact.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      open={open}
      title={isEditing ? "Edit Contact" : "New Contact"}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Name"
          name="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          required
          value={name}
        />
        <Input
          label="Email"
          name="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          required
          type="email"
          value={email}
        />
        <Input
          label="Phone"
          name="phone"
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 234 567 890"
          required
          value={phone}
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-600">
            Company
          </span>
          <select
            className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            name="company_id"
            onChange={(e) => setCompanyId(e.target.value)}
            value={companyId}
          >
            <option value="">Unassigned</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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
