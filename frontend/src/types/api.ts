export interface Account {
  name: string;
  description?: string;
  tags: string[];
}

export interface AccountCreate {
  name: string;
  description?: string;
  tags: string[];
}

export interface Value {
  id: string;
  account_name: string;
  amount: number;
  date: string;
}

export interface ValueCreate {
  account_name: string;
  amount: number;
  date: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  account?: string;
}

export interface AggregatedDataPoint {
  date: string;
  total: number;
}

export type ViewMode = 'aggregated' | 'split';