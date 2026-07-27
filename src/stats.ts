import type {
  Transaction,
  TransactionType,
} from './types';

export type CategoryStat<TCategory extends string> = {
  category: TCategory;
  amountInCents: number;
  percent: number;
};

export type MonthlyStats = {
  monthTransactions: Transaction[];
  monthIncomeTransactions: Transaction[];
  monthExpenseTransactions: Transaction[];
  incomeInCents: number;
  expenseInCents: number;
  balanceInCents: number;
  count: number;
  incomeCount: number;
  expenseCount: number;
  incomeCategoryStats: CategoryStat<string>[];
  expenseCategoryStats: CategoryStat<string>[];
};

function isSameMonth(date: string, currentDate: string) {
  return date.slice(0, 7) === currentDate.slice(0, 7);
}

function getTotalInCents(transactions: Transaction[]) {
  return transactions.reduce(
    (total, transaction) => total + transaction.amountInCents,
    0,
  );
}

function getCategoryStats(
  transactions: Transaction[],
  totalInCents: number,
): CategoryStat<string>[] {
  const categories = [...new Set(transactions.map((transaction) => transaction.category))];

  return categories
    .map((category) => {
      const amountInCents = transactions
        .filter((transaction) => transaction.category === category)
        .reduce((total, transaction) => total + transaction.amountInCents, 0);

      return {
        category,
        amountInCents,
        percent: totalInCents > 0 ? Math.round((amountInCents / totalInCents) * 100) : 0,
      };
    })
    .filter((stat) => stat.amountInCents > 0);
}

function getTransactionsByType(
  transactions: Transaction[],
  type: TransactionType,
) {
  return transactions.filter((transaction) => transaction.type === type);
}

export function getMonthlyStats(
  transactions: Transaction[],
  currentDate: string,
): MonthlyStats {
  const monthTransactions = transactions.filter((transaction) =>
    isSameMonth(transaction.date, currentDate),
  );
  const monthIncomeTransactions = getTransactionsByType(monthTransactions, 'income');
  const monthExpenseTransactions = getTransactionsByType(monthTransactions, 'expense');
  const incomeInCents = getTotalInCents(monthIncomeTransactions);
  const expenseInCents = getTotalInCents(monthExpenseTransactions);

  return {
    monthTransactions,
    monthIncomeTransactions,
    monthExpenseTransactions,
    incomeInCents,
    expenseInCents,
    balanceInCents: incomeInCents - expenseInCents,
    count: monthTransactions.length,
    incomeCount: monthIncomeTransactions.length,
    expenseCount: monthExpenseTransactions.length,
    incomeCategoryStats: getCategoryStats(
      monthIncomeTransactions,
      incomeInCents,
    ),
    expenseCategoryStats: getCategoryStats(
      monthExpenseTransactions,
      expenseInCents,
    ),
  };
}
