import { apiClient } from "@/api/client";
import type { ApiSuccessResponse } from "@/types";

import type { Company } from "./types";

export async function getCompanies(): Promise<Company[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Company[]>>("/companies");
  return response.data.data;
}
