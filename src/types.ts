export const expenseCategories = ['餐饮', '交通', '学习', '购物', '娱乐', '生活', '其他'] as const;

export const incomeCategories = [
  '生活费',
  '兼职',
  '奖学金',
  '红包',
  '退款',
  '其他收入',
] as const;

export const categories = expenseCategories;

export type ExpenseCategory = string;
export type IncomeCategory = string;
export type Category = string;
export type TransactionCategory = string;
export type TransactionType = 'expense' | 'income';

type BaseTransaction = {
  id: string;
  amountInCents: number;
  note: string;
  date: string;
  createdAt: string;
};

export type ExpenseTransaction = BaseTransaction & {
  type: 'expense';
  category: ExpenseCategory;
};

export type IncomeTransaction = BaseTransaction & {
  type: 'income';
  category: IncomeCategory;
};

export type Transaction = ExpenseTransaction | IncomeTransaction;
