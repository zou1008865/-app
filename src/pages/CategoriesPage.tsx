import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryColors } from '../categoryVisuals';
import { getMonthlyStats } from '../stats';
import { loadTransactions } from '../storage';
import type { TransactionCategory, TransactionType } from '../types';

function getCurrentMonth() {
  return new Date().toLocaleDateString('en-CA').slice(0, 7);
}

function formatCurrency(amountInCents: number) {
  return `¥${(amountInCents / 100).toFixed(2)}`;
}

function createDonutBackground(stats: { category: TransactionCategory; percent: number }[]) {
  let currentPercent = 0;
  const segments = stats.map((stat) => {
    const startPercent = currentPercent;
    currentPercent += stat.percent;
    return `${categoryColors[stat.category]} ${startPercent}% ${currentPercent}%`;
  });

  if (currentPercent < 100) {
    segments.push(`#e8f1ee ${currentPercent}% 100%`);
  }

  return segments.length > 0 ? `conic-gradient(${segments.join(', ')})` : '#e8f1ee';
}

function getTypeLabel(type: TransactionType) {
  return type === 'expense' ? '支出' : '收入';
}

function CategoryStatSection({
  type,
  title,
  totalInCents,
  stats,
  selectedMonth,
}: {
  type: TransactionType;
  title: string;
  totalInCents: number;
  stats: { category: TransactionCategory; amountInCents: number; percent: number }[];
  selectedMonth: string;
}) {
  const donutBackground = createDonutBackground(stats);

  return (
    <section className={`category-stat-card ${type}-stat-card`} aria-labelledby={`${type}-title`}>
      <div className="category-stat-header">
        <div>
          <span className="section-kicker">{getTypeLabel(type)}分类</span>
          <h2 id={`${type}-title`}>{title}</h2>
        </div>
        <strong>{formatCurrency(totalInCents)}</strong>
      </div>

      {stats.length > 0 ? (
        <div className="category-stat-body">
          <div
            className="donut-chart"
            aria-label={`${getTypeLabel(type)}分类占比图`}
            style={{ background: donutBackground }}
          >
            <div>
              <span>{getTypeLabel(type)}</span>
              <strong>{formatCurrency(totalInCents)}</strong>
            </div>
          </div>

          <div className="category-list">
            {stats.map((item) => (
              <Link
                className="category-row category-link-row"
                key={item.category}
                to={`/categories/${type}/${encodeURIComponent(item.category)}?month=${selectedMonth}`}
              >
                <span
                  className="color-dot"
                  style={{ backgroundColor: categoryColors[item.category] }}
                />
                <span>{item.category}</span>
                <strong>{formatCurrency(item.amountInCents)}</strong>
                <em>{item.percent}%</em>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state stat-empty">
          <strong>本月暂无{getTypeLabel(type)}</strong>
          <p>新增{getTypeLabel(type)}后，这里会显示分类占比。</p>
        </div>
      )}
    </section>
  );
}

export default function CategoriesPage() {
  const initialResult = useMemo(() => loadTransactions(), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const monthlyStats = useMemo(
    () => getMonthlyStats(initialResult.transactions, selectedMonth),
    [initialResult.transactions, selectedMonth],
  );

  return (
    <main className="app-shell categories-page">
      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>分类统计</h1>
            <span>{selectedMonth}</span>
          </div>
          <p>看看这个月的钱主要从哪里来，又主要花到了哪里。</p>
        </div>
      </header>

      {initialResult.hasError && (
        <p className="storage-message">本地数据读取异常，已尽量显示可用分类统计。</p>
      )}

      <section className="filter-panel category-month-filter" aria-label="分类统计筛选">
        <label>
          <span>月份</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </section>

      <div className="category-overview-grid">
        <CategoryStatSection
          type="expense"
          title="钱主要花在哪里"
          totalInCents={monthlyStats.expenseInCents}
          stats={monthlyStats.expenseCategoryStats}
          selectedMonth={selectedMonth}
        />
        <CategoryStatSection
          type="income"
          title="钱主要从哪里来"
          totalInCents={monthlyStats.incomeInCents}
          stats={monthlyStats.incomeCategoryStats}
          selectedMonth={selectedMonth}
        />
      </div>
    </main>
  );
}
