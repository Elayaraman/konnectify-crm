import { apiClient } from "@/api/client";
import type { ApiSuccessResponse } from "@/types";

import type { Contact } from "./types";

export async function getContacts(): Promise<Contact[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Contact[]>>("/contacts");
  return response.data.data;
}

export async function createContact(data: {
  name: string;
  email: string;
  phone: string;
  company_id: number | null;
}): Promise<Contact> {
  const response = await apiClient.post<ApiSuccessResponse<Contact>>(
    "/contacts",
    data,
  );
  return response.data.data;
}

export async function updateContact(
  id: number,
  data: Record<string, unknown>,
): Promise<Contact> {
  const response = await apiClient.patch<ApiSuccessResponse<Contact>>(
    `/contacts/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteContact(id: number): Promise<void> {
  await apiClient.delete(`/contacts/${id}`);
}
