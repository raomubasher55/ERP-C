const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:4000";

type ApiError = {
  message: string;
  errors?: { path: string; message: string }[];
};

const buildHeaders = (token?: string, extra?: Record<string, string>) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const request = async <T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.token, options.headers as Record<string, string>),
  });

  const data = (await res.json()) as T | ApiError;
  if (!res.ok) {
    throw data as ApiError;
  }
  return data as T;
};

export const api = {
  get: <T>(path: string, token?: string) => request<T>(path, { method: "GET", token }),
  post: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}), token }),
  patch: <T>(path: string, body?: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}), token }),
  delete: <T>(path: string, token?: string) => request<T>(path, { method: "DELETE", token }),
};

export type { ApiError };
