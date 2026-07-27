import type { CustomCategories } from './categoryStorage';
import type { Transaction, TransactionType } from './types';

type ApiState = { transactions: Transaction[]; customCategories: CustomCategories; migrated: boolean };
type MigrationResult = { status: 'migrated' | 'already-migrated' | 'waiting-for-5173'; transactions?: number; categories?: number };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || '本机数据库暂时不可用。'); }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
export const getState = () => request<ApiState>('/api/state');
export const createTransaction = (transaction: Transaction) => request<Transaction>('/api/transactions', { method: 'POST', body: JSON.stringify(transaction) });
export const removeTransaction = (id: string) => request<void>(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const addCategory = (type: TransactionType, name: string) => request<{ type: TransactionType; name: string }>('/api/categories', { method: 'POST', body: JSON.stringify({ type, name }) });
export const renameCategory = (type: TransactionType, name: string, nextName: string) => request<{ type: TransactionType; name: string }>(`/api/categories/${type}/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify({ name: nextName }) });
export const deleteCategory = (type: TransactionType, name: string, replacement: string) => request<void>(`/api/categories/${type}/${encodeURIComponent(name)}`, { method: 'DELETE', body: JSON.stringify({ replacement }) });
export const migrateLocalStorage = (transactions: Transaction[], customCategories: CustomCategories) => request<MigrationResult>('/api/migrate/local-storage', { method: 'POST', body: JSON.stringify({ transactions, customCategories }) });
