import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { categoryColors } from '../categoryVisuals';
import { loadTransactions } from '../storage';
import { expenseCategories, incomeCategories } from '../types';
import type { Transaction, TransactionCategory, TransactionType } from '../types';

function getCurrentMonth() {
  return new Date().toLocaleDateString('en-CA').slice(0, 7);
}

function formatCurrency(amountInCents: number) {
  return `¥${(amountInCents / 100).toFixed(2)}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function getTypeLabel(type: TransactionType) {
  return type === 'expense' ? '支出' : '收入';
}

function isTransactionType(value: string | undefined): value is TransactionType {
  return value === 'expense' || value === 'income';
}

function isValidCategory(type: TransactionType, category: string): category is TransactionCategory {
  return type === 'expense'
    ? expenseCategories.includes(category as never)
    : incomeCategories.includes(category as never);
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

export default function CategoryDetailPage() {
  const { type, category } = useParams();
  const [searchParams] = useSearchParams();
  const decodedCategory = category ? decodeURIComponent(category) : '';
  const initialMonth = searchParams.get('month') || getCurrentMonth();
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const initialResult = useMemo(() => loadTransactions(), []);

  if (!isTransactionType(type) || !isValidCategory(type, decodedCategory)) {
    return (
      <main className="app-shell">
        <section className="empty-state category-route-empty">
          <strong>这个分类地址不正确</strong>
          <p>请从分类统计页点击分类进入详情。</p>
          <Link className="text-link" to="/categories">
            返回分类统计
          </Link>
        </section>
      </main>
    );
  }

  const categoryTransactions = sortTransactions(
    initialResult.transactions.filter(
      (transaction) =>
        transaction.type === type &&
        transaction.category === decodedCategory &&
        transaction.date.slice(0, 7) === selectedMonth,
    ),
  );
  const totalInCents = categoryTransactions.reduce(
    (total, transaction) => total + transaction.amountInCents,
    0,
  );

  return (
    <main className="app-shell category-detail-page">
      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>{decodedCategory}</h1>
            <span>{getTypeLabel(type)}分类详情</span>
          </div>
          <p>查看这个分类在当前月份下的全部记录。</p>
        </div>
        <Link className="secondary-action-link" to="/categories">
          返回分类统计
        </Link>
      </header>

      {initialResult.hasError && (
        <p className="storage-message">本地数据读取异常，已尽量显示可用分类详情。</p>
      )}

      <section className="filter-panel category-month-filter" aria-label="分类详情筛选">
        <label>
          <span>月份</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </section>

      <section className="detail-summary-grid" aria-label="分类详情汇总">
        <div className={`detail-summary-card ${type}-summary`}>
          <span>分类类型</span>
          <strong>{getTypeLabel(type)}</strong>
        </div>
        <div className="detail-summary-card">
          <span>分类名称</span>
          <strong>{decodedCategory}</strong>
        </div>
        <div className="detail-summary-card">
          <span>分类总额</span>
          <strong>{formatCurrency(totalInCents)}</strong>
        </div>
        <div className="detail-summary-card">
          <span>记录数量</span>
          <strong>{categoryTransactions.length} 笔</strong>
        </div>
      </section>

      <section className="detail-list-panel" aria-labelledby="category-detail-title">
        <div className="panel-header">
          <div>
            <span className="section-kicker">全部记录</span>
            <h2 id="category-detail-title">{selectedMonth} 的{decodedCategory}</h2>
          </div>
        </div>

        {categoryTransactions.length > 0 ? (
          <div className="detail-list">
            {categoryTransactions.map((transaction) => (
              <article className="detail-item" key={transaction.id}>
                <span
                  className="record-marker"
                  style={{ backgroundColor: categoryColors[decodedCategory] }}
                />
                <div className="detail-info">
                  <strong>{transaction.note || '无备注'}</strong>
                  <p>{decodedCategory}</p>
                  <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
                </div>
                <div className={`detail-amount ${type}`}>
                  <strong>
                    {type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amountInCents)}
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>这个月份没有记录</strong>
            <p>可以换一个月份，或返回分类统计页查看其他分类。</p>
          </div>
        )}
      </section>
    </main>
  );
}
