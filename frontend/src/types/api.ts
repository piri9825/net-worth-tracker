export type Term = "Short Term" | "Long Term" | null;
export type AccountType = "Asset" | "Liability" | null;
export type Portfolio = "Liquid" | "Illiquid" | "Cash Reserves" | null;
export type AssetClass = "Cash" | "Equities" | "Crypto" | "Real Estate" | null;

export interface Account {
  name: string;
  description?: string | null;
  term?: Term;
  type?: AccountType;
  portfolio?: Portfolio;
  asset_class?: AssetClass;
}

export interface AccountCreate {
  name: string;
  description?: string | null;
  term?: Term;
  type?: AccountType;
  portfolio?: Portfolio;
  asset_class?: AssetClass;
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