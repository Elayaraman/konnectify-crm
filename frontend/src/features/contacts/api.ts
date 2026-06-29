import { apiClient } from "@/api/client";
import type { ApiSuccessResponse } from "@/types";

import type { Contact } from "./types";

export async function getContacts(): Promise<Contact[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Contact[]>>("/contacts");
  return response.data.data;
}
