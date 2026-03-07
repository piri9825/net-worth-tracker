import type { Account, Value } from '../types/api';

const API_BASE_URL = 'http://localhost:8000/api';

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}

export const accountsApi = {
  getAll: () => apiFetch<Account[]>('/accounts/'),
};

export const valuesApi = {
  getByAccount: (accountName: string, params?: { start_date?: string; end_date?: string }) =>
    apiFetch<Value[]>(`/values/account/${encodeURIComponent(accountName)}`, params as Record<string, string>),
};
