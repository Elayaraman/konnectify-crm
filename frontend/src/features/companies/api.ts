import { apiClient } from "@/api/client";
import type { ApiSuccessResponse } from "@/types";

import type { Company } from "./types";

export async function getCompanies(): Promise<Company[]> {
  const response =
    await apiClient.get<ApiSuccessResponse<Company[]>>("/companies");
  return response.data.data;
}

export async function createCompany(data: {
  name: string;
  domain: string;
  plan: string;
}): Promise<Company> {
  const response = await apiClient.post<ApiSuccessResponse<Company>>(
    "/companies",
    data,
  );
  return response.data.data;
}

export async function updateCompany(
  id: number,
  data: Record<string, unknown>,
): Promise<Company> {
  const response = await apiClient.patch<ApiSuccessResponse<Company>>(
    `/companies/${id}`,
    data,
  );
  return response.data.data;
}

export async function deleteCompany(id: number): Promise<void> {
  await apiClient.delete(`/companies/${id}`);
}
