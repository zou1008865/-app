import { useMemo, useState } from 'react';
import { loadTransactions, saveTransactions } from '../storage';
import { expenseCategories, incomeCategories } from '../types';
import type { Transaction, TransactionCategory, TransactionType } from '../types';

type TypeFilter = 'all' | TransactionType;
type CategoryFilter = 'all' | TransactionCategory;

function getCurrentMonth() {
  return new Date().toLocaleDateString('en-CA').slice(0, 7);
}

function formatCurrency(amountInCents: number) {
  return `¥${(amountInCents / 100).toFixed(2)}`;
}

function formatSignedCurrency(amountInCents: number) {
  const sign = amountInCents > 0 ? '+' : amountInCents < 0 ? '-' : '';

  return `${sign}${formatCurrency(Math.abs(amountInCents))}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function getTypeLabel(type: TransactionType) {
  return type === 'expense' ? '支出' : '收入';
}

function getAvailableCategories(typeFilter: TypeFilter) {
  if (typeFilter === 'income') {
    return incomeCategories;
  }

  if (typeFilter === 'expense') {
    return expenseCategories;
  }

  return [...expenseCategories, ...incomeCategories] as const;
}

function isSameMonth(date: string, month: string) {
  return date.slice(0, 7) === month;
}

function sortTransactions(transactions: Transaction[]) {
  return [...transactions].sort((first, second) => {
    const dateDiff = second.date.localeCompare(first.date);

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return second.createdAt.localeCompare(first.createdAt);
  });
}

export default function TransactionsPage() {
  const initialResult = useMemo(() => loadTransactions(), []);
  const [transactions, setTransactions] = useState<Transaction[]>(initialResult.transactions);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [storageMessage, setStorageMessage] = useState(
    initialResult.hasError ? '本地数据读取异常，已尽量显示可用明细。' : '',
  );

  const availableCategories = useMemo(() => getAvailableCategories(typeFilter), [typeFilter]);
  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesMonth = isSameMonth(transaction.date, selectedMonth);
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesCategory =
        categoryFilter === 'all' || transaction.category === categoryFilter;

      return matchesMonth && matchesType && matchesCategory;
    });

    return sortTransactions(filtered);
  }, [categoryFilter, selectedMonth, transactions, typeFilter]);
  const filteredIncomeInCents = filteredTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amountInCents, 0);
  const filteredExpenseInCents = filteredTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amountInCents, 0);
  const filteredBalanceInCents = filteredIncomeInCents - filteredExpenseInCents;

  function handleTypeFilterChange(nextTypeFilter: TypeFilter) {
    setTypeFilter(nextTypeFilter);
    setCategoryFilter('all');
  }

  function handleDeleteTransaction(transactionId: string) {
    const shouldDelete = window.confirm('确定要删除这条收支记录吗？');

    if (!shouldDelete) {
      return;
    }

    setTransactions((currentTransactions) => {
      const nextTransactions = currentTransactions.filter(
        (transaction) => transaction.id !== transactionId,
      );
      const isSaved = saveTransactions(nextTransactions);

      setStorageMessage(isSaved ? '' : '本地保存失败，请检查浏览器存储权限。');

      return nextTransactions;
    });
  }

  return (
    <main className="app-shell transactions-page">
      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>收支明细</h1>
            <span>{selectedMonth}</span>
          </div>
          <p>按月份、类型和分类筛选记录，找账的时候不用翻小本本。</p>
        </div>
      </header>

      {storageMessage && <p className="storage-message">{storageMessage}</p>}

      <section className="filter-panel" aria-label="收支明细筛选">
        <label>
          <span>月份</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>

        <label>
          <span>类型</span>
          <select
            value={typeFilter}
            onChange={(event) => handleTypeFilterChange(event.target.value as TypeFilter)}
          >
            <option value="all">全部</option>
            <option value="income">收入</option>
            <option value="expense">支出</option>
          </select>
        </label>

        <label>
          <span>分类</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
          >
            <option value="all">全部分类</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="detail-summary-grid" aria-label="筛选结果汇总">
        <div className="detail-summary-card income-summary">
          <span>筛选收入</span>
          <strong>{formatCurrency(filteredIncomeInCents)}</strong>
        </div>
        <div className="detail-summary-card expense-summary">
          <span>筛选支出</span>
          <strong>{formatCurrency(filteredExpenseInCents)}</strong>
        </div>
        <div className="detail-summary-card">
          <span>筛选结余</span>
          <strong className={filteredBalanceInCents < 0 ? 'negative' : ''}>
            {formatSignedCurrency(filteredBalanceInCents)}
          </strong>
        </div>
        <div className="detail-summary-card">
          <span>记录数量</span>
          <strong>{filteredTransactions.length} 笔</strong>
        </div>
      </section>

      <section className="detail-list-panel" aria-labelledby="detail-list-title">
        <div className="panel-header">
          <div>
            <span className="section-kicker">筛选结果</span>
            <h2 id="detail-list-title">全部明细</h2>
          </div>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="detail-list">
            {filteredTransactions.map((transaction) => (
              <article className="detail-item" key={transaction.id}>
                <div className={`type-badge ${transaction.type}`}>
                  {getTypeLabel(transaction.type)}
                </div>
                <div className="detail-info">
                  <strong>{transaction.category}</strong>
                  <p>{transaction.note || '无备注'}</p>
                  <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                </div>
                <div className={`detail-amount ${transaction.type}`}>
                  <strong>
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amountInCents)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(transaction.id)}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>没有符合条件的记录</strong>
            <p>可以换一个月份、类型或分类再看看。</p>
          </div>
        )}
      </section>
    </main>
  );
}
