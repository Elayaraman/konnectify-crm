import { apiClient } from "@/api/client";
import type { ApiSuccessResponse } from "@/types";

import type { Ticket } from "./types";

export async function getTickets(): Promise<Ticket[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Ticket[]>>("/tickets");
  return response.data.data;
}

export async function createTicket(data: {
  title: string;
  description: string;
  status: string;
  priority: string;
  contact_id: number | null;
  company_id: number | null;
}): Promise<Ticket> {
  const response = await apiClient.post<ApiSuccessResponse<Ticket>>(
    "/tickets",
    data,
  );
  return response.data.data;
}

export async function updateTicket(
  id: number,
  data: Record<string, unknown>,
): Promise<Ticket> {
  const response = await apiClient.patch<ApiSuccessResponse<Ticket>>(
    `/tickets/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteTicket(id: number): Promise<void> {
  await apiClient.delete(`/tickets/${id}`);
}
