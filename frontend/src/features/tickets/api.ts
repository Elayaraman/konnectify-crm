import { apiClient } from "@/api/client";
import type { ApiSuccessResponse } from "@/types";

import type { Ticket } from "./types";

export async function getTickets(): Promise<Ticket[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Ticket[]>>("/tickets");
  return response.data.data;
}
