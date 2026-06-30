import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const baseURL = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});
