import { expenseCategories, incomeCategories } from './types';
import type { TransactionType } from './types';

const CUSTOM_CATEGORIES_KEY = 'student-finance-tracker:custom-categories:v1';

export type CustomCategories = Record<TransactionType, string[]>;

const emptyCategories = (): CustomCategories => ({ expense: [], income: [] });

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function isCustomCategories(value: unknown): value is CustomCategories {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return ['expense', 'income'].every(
    (type) => Array.isArray(data[type]) && data[type].every((name) => typeof name === 'string' && normalizeName(name).length > 0),
  );
}

export function loadCustomCategories(): CustomCategories {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) return emptyCategories();
    const data = JSON.parse(raw);
    return isCustomCategories(data)
      ? { expense: data.expense.map(normalizeName), income: data.income.map(normalizeName) }
      : emptyCategories();
  } catch {
    return emptyCategories();
  }
}

export function saveCustomCategories(categories: CustomCategories) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    return true;
  } catch {
    return false;
  }
}

export function getCategories(type: TransactionType, customCategories = loadCustomCategories()) {
  const presets = type === 'expense' ? expenseCategories : incomeCategories;
  return [...presets, ...customCategories[type]];
}

export function isPresetCategory(type: TransactionType, category: string) {
  const presets = type === 'expense' ? expenseCategories : incomeCategories;
  return presets.includes(category as never);
}

export function canUseCategory(type: TransactionType, category: string, customCategories = loadCustomCategories()) {
  return getCategories(type, customCategories).includes(category);
}

export function cleanCategoryName(value: string) {
  return normalizeName(value);
}
