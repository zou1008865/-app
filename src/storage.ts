import { expenseCategories, incomeCategories } from './types';
import type { ExpenseCategory, IncomeCategory, Transaction } from './types';

export const LEGACY_STORAGE_KEY = 'student-expense-tracker:v1';
export const STORAGE_KEY = 'student-finance-tracker:v2';
const STORAGE_VERSION = 2;
const LEGACY_STORAGE_VERSION = 1;

type LegacyExpense = {
  id: string;
  amountInCents: number;
  category: ExpenseCategory;
  note: string;
  date: string;
  createdAt: string;
};

type StoredTransactionData = {
  version: number;
  transactions: Transaction[];
};

type LegacyStoredExpenseData = {
  version: number;
  expenses: LegacyExpense[];
};

export type LoadTransactionsResult = {
  transactions: Transaction[];
  hasError: boolean;
  migratedFromV1: boolean;
};

function isPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && expenseCategories.includes(value as never);
}

function isIncomeCategory(value: unknown): value is IncomeCategory {
  return typeof value === 'string' && incomeCategories.includes(value as never);
}

function isLegacyExpense(value: unknown): value is LegacyExpense {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const expense = value as Record<string, unknown>;

  return (
    typeof expense.id === 'string' &&
    isPositiveInteger(expense.amountInCents) &&
    isExpenseCategory(expense.category) &&
    typeof expense.note === 'string' &&
    typeof expense.date === 'string' &&
    typeof expense.createdAt === 'string'
  );
}

function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const transaction = value as Record<string, unknown>;
  const type = transaction.type;
  const category = transaction.category;
  const hasValidCategory =
    type === 'expense'
      ? isExpenseCategory(category)
      : type === 'income' && isIncomeCategory(category);

  return (
    typeof transaction.id === 'string' &&
    (type === 'expense' || type === 'income') &&
    isPositiveInteger(transaction.amountInCents) &&
    hasValidCategory &&
    typeof transaction.note === 'string' &&
    typeof transaction.date === 'string' &&
    typeof transaction.createdAt === 'string'
  );
}

function isStoredTransactionData(value: unknown): value is StoredTransactionData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    data.version === STORAGE_VERSION &&
    Array.isArray(data.transactions) &&
    data.transactions.every(isTransaction)
  );
}

function isLegacyStoredExpenseData(value: unknown): value is LegacyStoredExpenseData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    data.version === LEGACY_STORAGE_VERSION &&
    Array.isArray(data.expenses) &&
    data.expenses.every(isLegacyExpense)
  );
}

function readStoredJson(storageKey: string) {
  const storedValue = localStorage.getItem(storageKey);

  if (storedValue === null) {
    return { exists: false, value: null };
  }

  return { exists: true, value: JSON.parse(storedValue) };
}

function migrateLegacyExpenses(expenses: LegacyExpense[]): Transaction[] {
  return expenses.map((expense) => ({
    ...expense,
    type: 'expense',
  }));
}

export function saveTransactions(transactions: Transaction[]) {
  const data: StoredTransactionData = {
    version: STORAGE_VERSION,
    transactions,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadTransactions(): LoadTransactionsResult {
  try {
    const v2Data = readStoredJson(STORAGE_KEY);

    if (v2Data.exists) {
      if (!isStoredTransactionData(v2Data.value)) {
        return { transactions: [], hasError: true, migratedFromV1: false };
      }

      return {
        transactions: v2Data.value.transactions,
        hasError: false,
        migratedFromV1: false,
      };
    }

    const v1Data = readStoredJson(LEGACY_STORAGE_KEY);

    if (!v1Data.exists) {
      return { transactions: [], hasError: false, migratedFromV1: false };
    }

    if (!isLegacyStoredExpenseData(v1Data.value)) {
      return { transactions: [], hasError: true, migratedFromV1: false };
    }

    const transactions = migrateLegacyExpenses(v1Data.value.expenses);
    const isSaved = saveTransactions(transactions);

    return {
      transactions,
      hasError: !isSaved,
      migratedFromV1: isSaved,
    };
  } catch {
    return { transactions: [], hasError: true, migratedFromV1: false };
  }
}
