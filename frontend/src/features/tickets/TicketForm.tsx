import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useCRMStore } from "@/store/useCRMStore";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@/types";
import type { Ticket, TicketPriority, TicketStatus } from "@/types";

import { createTicket, updateTicket } from "./api";

type TicketFormProps = {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket;
};

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TicketForm({ open, onClose, ticket }: TicketFormProps) {
  const contacts = useCRMStore((state) => state.contacts);
  const companies = useCRMStore((state) => state.companies);
  const addTicketToStore = useCRMStore((state) => state.addTicket);
  const updateTicketInStore = useCRMStore((state) => state.updateTicket);

  const [title, setTitle] = useState(ticket?.title ?? "");
  const [description, setDescription] = useState(ticket?.description ?? "");
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? "open");
  const [priority, setPriority] = useState<TicketPriority>(ticket?.priority ?? "medium");
  const [companyId, setCompanyId] = useState(
    ticket?.company?.id?.toString() ?? "",
  );
  const [contactId, setContactId] = useState(
    ticket?.contact?.id?.toString() ?? "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = ticket !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing) {
        const updated = await updateTicket(ticket.id, {
          title,
          description,
          status,
          priority,
          company_id: companyId ? Number(companyId) : null,
          contact_id: contactId ? Number(contactId) : null,
        });
        updateTicketInStore(updated);
      } else {
        const created = await createTicket({
          title,
          description,
          status,
          priority,
          company_id: companyId ? Number(companyId) : null,
          contact_id: contactId ? Number(contactId) : null,
        });
        addTicketToStore(created);
      }

      onClose();
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error ? caughtError.message : "Failed to save ticket.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} open={open} title={isEditing ? "Edit Ticket" : "New Ticket"}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Input
          label="Title"
          name="title"
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ticket title"
          required
          value={title}
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-600">
            Description
          </span>
          <textarea
            className="h-24 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            name="description"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue"
            required
            value={description}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-600">
              Status
            </span>
            <select
              className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              name="status"
              onChange={(e) => setStatus(e.target.value as TicketStatus)}
              required
              value={status}
            >
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-600">
              Priority
            </span>
            <select
              className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
              name="priority"
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              required
              value={priority}
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {formatLabel(p)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-600">
            Company
          </span>
          <select
            className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            name="company_id"
            onChange={(e) => {
              const newCompanyId = e.target.value;
              setCompanyId(newCompanyId);
              if (!newCompanyId) {
                setContactId("");
              }
            }}
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
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-neutral-600">
            Contact
          </span>
          <select
            className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            name="contact_id"
            onChange={(e) => setContactId(e.target.value)}
            value={contactId}
          >
            <option value="">Unassigned</option>
            {contacts
              .filter((c) => !companyId || c.company_id === Number(companyId))
              .map((c) => (
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
