import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import { useCRMStore } from "@/store/useCRMStore";
import type { Contact } from "@/types";

import { deleteContact, getContacts } from "./api";
import { ContactForm } from "./ContactForm";
import { ContactTable } from "./ContactTable";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function ContactsView() {
  const contacts = useCRMStore((state) => state.contacts);
  const setContacts = useCRMStore((state) => state.setContacts);
  const removeContact = useCRMStore((state) => state.removeContact);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getContacts();
      setContacts(data);
    } catch (caughtError) {
      setErrorMessage(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load contacts.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [setContacts]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const filteredContacts = useMemo(() => {
    const query = normalize(search);

    return contacts.filter((contact) =>
      query.length === 0
        ? true
        : normalize(
            [contact.name, contact.email, contact.phone, contact.company?.name ?? ""].join(
              " ",
            ),
          ).includes(query),
    );
  }, [contacts, search]);

  function handleEdit(contact: Contact) {
    setEditingContact(contact);
    setIsFormOpen(true);
  }

  async function handleDelete(contact: Contact) {
    if (!window.confirm(`Delete contact "${contact.name}"?`)) {
      return;
    }

    try {
      await deleteContact(contact.id);
      removeContact(contact.id);
    } catch {
      // silently handle — user can retry
    }
  }

  function handleFormClose() {
    setIsFormOpen(false);
    setEditingContact(undefined);
  }

  if (isLoading) {
    return <Loading title="Loading contacts" />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={loadContacts} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            CRM
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
            Contacts
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Browse customer stakeholders and account ownership context.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>New Contact</Button>
      </div>

      <Card description="Search contacts by name, email, phone, or company." title="Contacts">
        <div className="border-b border-neutral-100 px-5 py-4">
          <Input
            aria-label="Search contacts"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search contacts..."
            value={search}
          />
        </div>
        <div className="p-5">
          {contacts.length === 0 ? (
            <EmptyState
              description="Seed contacts should appear here once the backend is running."
              title="No contacts yet"
            />
          ) : filteredContacts.length === 0 ? (
            <EmptyState
              description="Try another search term to find matching contacts."
              title="No contacts match your search"
            />
          ) : (
            <ContactTable
              contacts={filteredContacts}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
        </div>
      </Card>

      {isFormOpen ? (
        <ContactForm
          contact={editingContact}
          key={editingContact?.id ?? "new"}
          onClose={handleFormClose}
          open={isFormOpen}
        />
      ) : null}
    </div>
  );
}
