import type { Account, Value } from '../types/api';

// Same-origin in production (served by FastAPI); proxied to the backend by Vite in dev
const API_BASE_URL = '/api';

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    let detail = `API error: ${response.status}`;
    try {
      const body = await response.json();
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // keep the generic message
    }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export interface SyncResult {
  accounts_loaded: number;
  values_loaded: number;
  file_name: string;
  drive_modified_time: string;
  skipped: boolean;
}

export const accountsApi = {
  getAll: () => apiFetch<Account[]>('/accounts/'),
};

export interface SyncStatus {
  file_name: string | null;
  last_synced_at: string | null;
  latest_value_date: string | null;
}

export const syncApi = {
  run: () => apiPost<SyncResult>('/sync/'),
  status: () => apiFetch<SyncStatus>('/sync/status'),
};

export const valuesApi = {
  getByAccount: (accountName: string, params?: { start_date?: string; end_date?: string }) =>
    apiFetch<Value[]>(`/values/account/${encodeURIComponent(accountName)}`, params as Record<string, string>),
};
