import axios from 'axios';
import { Account, Value } from '../types/api';

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const accountsApi = {
  getAll: async (): Promise<Account[]> => {
    const response = await apiClient.get<Account[]>('/accounts/');
    return response.data;
  },
  
  getByName: async (name: string): Promise<Account> => {
    const response = await apiClient.get<Account>(`/accounts/${encodeURIComponent(name)}`);
    return response.data;
  },
};

export const valuesApi = {
  getAll: async (params?: {
    account_name?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<Value[]> => {
    const response = await apiClient.get<Value[]>('/values/', { params });
    return response.data;
  },
  
  getByAccount: async (
    accountName: string,
    params?: {
      start_date?: string;
      end_date?: string;
    }
  ): Promise<Value[]> => {
    const response = await apiClient.get<Value[]>(
      `/values/account/${encodeURIComponent(accountName)}`,
      { params }
    );
    return response.data;
  },
};

export const dataService = {
  getAccountsByTags: async (selectedTags: string[]): Promise<Account[]> => {
    const allAccounts = await accountsApi.getAll();
    if (selectedTags.length === 0) return allAccounts;
    
    return allAccounts.filter(account =>
      selectedTags.some(tag => account.tags.includes(tag))
    );
  },
  
  getValuesByAccounts: async (
    accounts: Account[],
    dateRange?: { start_date?: string; end_date?: string }
  ): Promise<Value[]> => {
    const allValues: Value[] = [];
    
    for (const account of accounts) {
      const values = await valuesApi.getByAccount(account.name, dateRange);
      allValues.push(...values);
    }
    
    return allValues.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },
  
  getAllUniqueTags: async (): Promise<string[]> => {
    const accounts = await accountsApi.getAll();
    const allTags = accounts.flatMap(account => account.tags);
    return [...new Set(allTags)].sort();
  },
};