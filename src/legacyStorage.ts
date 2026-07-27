import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './storage';
import type { CustomCategories } from './categoryStorage';
import type { Transaction } from './types';

const CUSTOM_CATEGORIES_KEY = 'student-finance-tracker:custom-categories:v1';
export function readLegacyData(): { transactions: Transaction[]; customCategories: CustomCategories } {
  const customCategories: CustomCategories = { expense: [], income: [] };
  try {
    const v2 = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (v2?.version === 2 && Array.isArray(v2.transactions)) return { transactions: v2.transactions, customCategories: readCategories() };
    const v1 = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    if (v1?.version === 1 && Array.isArray(v1.expenses)) return { transactions: v1.expenses.map((item: Omit<Transaction, 'type'>) => ({ ...item, type: 'expense' })), customCategories: readCategories() };
  } catch { /* Invalid browser data is left untouched. */ }
  return { transactions: [], customCategories };
}
function readCategories(): CustomCategories {
  try { const value = JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_KEY) || 'null'); return Array.isArray(value?.expense) && Array.isArray(value?.income) ? { expense: value.expense, income: value.income } : { expense: [], income: [] }; } catch { return { expense: [], income: [] }; }
}
