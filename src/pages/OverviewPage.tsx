import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { categoryColors, getCategoryColor } from '../categoryVisuals';
import { getCategories, loadCustomCategories } from '../categoryStorage';
import { getMonthlyStats } from '../stats';
import { createTransaction, getState, removeTransaction } from '../api';
import type {
  Transaction,
  TransactionCategory,
  TransactionType,
} from '../types';

const RECORDS_PER_PAGE = 4;

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA');
}

function formatMonth(date: string) {
  const [year, month] = date.split('-');
  return `${year}年${Number(month)}月`;
}

function parseAmountToCents(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(trimmedValue)) {
    return null;
  }

  const [yuan, cents = ''] = trimmedValue.split('.');
  const amountInCents = Number(yuan) * 100 + Number(cents.padEnd(2, '0'));

  return amountInCents > 0 ? amountInCents : null;
}

function formatCurrency(amountInCents: number) {
  return `¥${(amountInCents / 100).toFixed(2)}`;
}

function formatSignedCurrency(amountInCents: number) {
  const sign = amountInCents > 0 ? '+' : amountInCents < 0 ? '-' : '';

  return `${sign}${formatCurrency(Math.abs(amountInCents))}`;
}

function formatDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

function createTransactionId(type: TransactionType) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTypeLabel(type: TransactionType) {
  return type === 'expense' ? '支出' : '收入';
}

export default function OverviewPage() {
  const today = useMemo(() => getTodayDate(), []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState(() => loadCustomCategories());
  const availableExpenseCategories = useMemo(
    () => getCategories('expense', customCategories), [customCategories],
  );
  const availableIncomeCategories = useMemo(
    () => getCategories('income', customCategories), [customCategories],
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('餐饮');
  const [incomeCategory, setIncomeCategory] = useState('生活费');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [storageMessage, setStorageMessage] = useState('');
  useEffect(() => { getState().then((state) => { setTransactions(state.transactions); setCustomCategories(state.customCategories); }).catch((error: Error) => setStorageMessage(error.message)); }, []);
  const monthLabel = useMemo(() => formatMonth(today), [today]);
  const monthlyStats = useMemo(() => getMonthlyStats(transactions, today), [transactions, today]);
  const totalPages = Math.max(1, Math.ceil(transactions.length / RECORDS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * RECORDS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + RECORDS_PER_PAGE, transactions.length);
  const pagedTransactions = transactions.slice(pageStartIndex, pageEndIndex);
  const pageRangeText =
    transactions.length > 0
      ? `${pageStartIndex + 1}–${pageEndIndex} / 共 ${transactions.length} 条`
      : `0 / 共 0 条`;
  function createDonutBackground(stats: { category: TransactionCategory; percent: number }[]) {
    let currentPercent = 0;
    const segments = stats.map((stat) => {
      const startPercent = currentPercent;
      currentPercent += stat.percent;
      return `${getCategoryColor(stat.category)} ${startPercent}% ${currentPercent}%`;
    });

    if (currentPercent < 100) {
      segments.push(`#e8f1ee ${currentPercent}% 100%`);
    }

    return segments.length > 0 ? `conic-gradient(${segments.join(', ')})` : '#e8f1ee';
  }

  const expenseDonutBackground = useMemo(() => {
    return createDonutBackground(monthlyStats.expenseCategoryStats);
  }, [monthlyStats.expenseCategoryStats, monthlyStats.expenseInCents]);

  const incomeDonutBackground = useMemo(() => {
    return createDonutBackground(monthlyStats.incomeCategoryStats);
  }, [monthlyStats.incomeCategoryStats, monthlyStats.incomeInCents]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountInCents = parseAmountToCents(amount);

    if (amountInCents === null) {
      setErrorMessage('请输入大于 0 的金额，最多保留两位小数。');
      return;
    }

    const createdAt = new Date().toISOString();
    const transaction: Transaction =
      transactionType === 'expense'
        ? {
            id: createTransactionId('expense'),
            type: 'expense',
            amountInCents,
            category: expenseCategory,
            note: note.trim(),
            date,
            createdAt,
          }
        : {
            id: createTransactionId('income'),
            type: 'income',
            amountInCents,
            category: incomeCategory,
            note: note.trim(),
            date,
            createdAt,
          };

    try { await createTransaction(transaction); setTransactions((current) => [transaction, ...current]); setStorageMessage(''); } catch (error) { setStorageMessage(error instanceof Error ? error.message : '账目保存失败。'); return; }
    setAmount('');
    setExpenseCategory('餐饮');
    setIncomeCategory('生活费');
    setTransactionType('expense');
    setDate(today);
    setNote('');
    setErrorMessage('');
    setCurrentPage(1);
    setIsDrawerOpen(false);
  }

  async function handleDeleteTransaction(transactionId: string) {
    const shouldDelete = window.confirm('确定要删除这条收支记录吗？');

    if (!shouldDelete) {
      return;
    }

    try { await removeTransaction(transactionId); setTransactions((current) => { const next = current.filter((transaction) => transaction.id !== transactionId); setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(next.length / RECORDS_PER_PAGE)))); return next; }); } catch (error) { setStorageMessage(error instanceof Error ? error.message : '账目删除失败。'); }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false);
    setErrorMessage('');
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <div className="title-row">
            <h1>学生记账</h1>
            <span>{monthLabel}</span>
          </div>
          <p>把食堂、通勤和学习用品记清楚，月底也能轻松复盘。</p>
        </div>
        <button type="button" className="header-action" onClick={() => setIsDrawerOpen(true)}>
          记一笔
        </button>
      </header>

      <section className="overview-panel finance-overview" aria-label="本月财务概览">
        <div className="overview-main balance-card">
          <span className="section-kicker">本月结余</span>
          <strong className={monthlyStats.balanceInCents < 0 ? 'negative' : ''}>
            {formatSignedCurrency(monthlyStats.balanceInCents)}
          </strong>
          <p>结余 = 本月收入 - 本月支出</p>
        </div>
        <div className="overview-side finance-summary-card income-summary">
          <span>本月收入</span>
          <strong>{formatCurrency(monthlyStats.incomeInCents)}</strong>
          <small>{monthlyStats.incomeCount} 笔收入</small>
        </div>
        <div className="overview-side finance-summary-card expense-summary">
          <span>本月支出</span>
          <strong>{formatCurrency(monthlyStats.expenseInCents)}</strong>
          <small>{monthlyStats.expenseCount} 笔支出</small>
          <div className="category-strip" aria-label="分类颜色示意">
            <i style={{ backgroundColor: categoryColors.餐饮 }} />
            <i style={{ backgroundColor: categoryColors.学习 }} />
            <i style={{ backgroundColor: categoryColors.交通 }} />
            <i style={{ backgroundColor: categoryColors.购物 }} />
            <i style={{ backgroundColor: categoryColors.其他 }} />
          </div>
        </div>
      </section>

      <section className="workspace-grid">
        <section className="quick-add-panel" aria-labelledby="quick-add-title">
          <div className="section-heading">
            <span className="section-kicker">新增记录</span>
            <h2 id="quick-add-title">收入和支出都从这里记</h2>
          </div>

          {storageMessage && <p className="storage-message">{storageMessage}</p>}

          <p>
            点击按钮打开侧边抽屉，选择收入或支出，再填写金额、分类、日期和备注。
          </p>

          <button type="button" onClick={() => setIsDrawerOpen(true)}>
            新增收支记录
          </button>
        </section>

        <section className="records-panel" aria-labelledby="records-title">
          <div className="panel-header">
            <div>
              <span className="section-kicker">最近记录</span>
              <h2 id="records-title">收支记录</h2>
            </div>
          </div>

          <div className="records-content">
            {transactions.length > 0 ? (
              <div className="record-list">
                {pagedTransactions.map((record) => (
                  <article className="record-item" key={record.id}>
                    <span
                      className="record-marker"
                      style={{ backgroundColor: getCategoryColor(record.category) }}
                    />
                    <div className="record-info">
                      <strong>
                        {getTypeLabel(record.type)} · {record.category}
                      </strong>
                      <p>{record.note || '无备注'}</p>
                      <time dateTime={record.date}>{formatDate(record.date)}</time>
                    </div>
                    <div className={`record-actions ${record.type}`}>
                      <b>
                        {record.type === 'income' ? '+' : '-'}
                        {formatCurrency(record.amountInCents)}
                      </b>
                      <button type="button" onClick={() => handleDeleteTransaction(record.id)}>
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>还没有收支记录</strong>
                <p>点击“新增收支记录”后，新记录会显示在这里。</p>
              </div>
            )}
          </div>

          <nav className="pagination-bar" aria-label="收支记录分页">
            <span>{pageRangeText}</span>
            <div className="pagination-actions">
              <button
                type="button"
                aria-label="上一页收支记录"
                title="上一页"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="下一页收支记录"
                title="下一页"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                ›
              </button>
            </div>
          </nav>
        </section>
      </section>

      <section className="chart-panel" aria-labelledby="chart-title">
        <div className="panel-header">
          <div>
            <span className="section-kicker">分类占比</span>
            <h2 id="chart-title">本月分类简报</h2>
          </div>
        </div>

        {monthlyStats.count > 0 ? (
          <div className="category-overview-grid">
            <section className="category-stat-card expense-stat-card" aria-labelledby="expense-stat-title">
              <div className="category-stat-header">
                <div>
                  <span className="section-kicker">支出分类</span>
                  <h3 id="expense-stat-title">钱主要花在哪里</h3>
                </div>
                <strong>{formatCurrency(monthlyStats.expenseInCents)}</strong>
              </div>

              {monthlyStats.expenseCategoryStats.length > 0 ? (
                <div className="category-stat-body">
                  <div
                    className="donut-chart"
                    aria-label="本月支出分类占比图"
                    style={{ background: expenseDonutBackground }}
                  >
                    <div>
                      <span>支出</span>
                      <strong>{formatCurrency(monthlyStats.expenseInCents)}</strong>
                    </div>
                  </div>

                  <div className="category-list">
                    {monthlyStats.expenseCategoryStats.map((item) => (
                      <div className="category-row" key={item.category}>
                        <span
                          className="color-dot"
                          style={{ backgroundColor: getCategoryColor(item.category) }}
                        />
                        <span>{item.category}</span>
                        <strong>{formatCurrency(item.amountInCents)}</strong>
                        <em>{item.percent}%</em>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state stat-empty">
                  <strong>本月暂无支出</strong>
                  <p>新增支出后，这里会显示支出占比。</p>
                </div>
              )}
            </section>

            <section className="category-stat-card income-stat-card" aria-labelledby="income-stat-title">
              <div className="category-stat-header">
                <div>
                  <span className="section-kicker">收入分类</span>
                  <h3 id="income-stat-title">钱主要从哪里来</h3>
                </div>
                <strong>{formatCurrency(monthlyStats.incomeInCents)}</strong>
              </div>

              {monthlyStats.incomeCategoryStats.length > 0 ? (
                <div className="category-stat-body">
                  <div
                    className="donut-chart"
                    aria-label="本月收入分类占比图"
                    style={{ background: incomeDonutBackground }}
                  >
                    <div>
                      <span>收入</span>
                      <strong>{formatCurrency(monthlyStats.incomeInCents)}</strong>
                    </div>
                  </div>

                  <div className="category-list">
                    {monthlyStats.incomeCategoryStats.map((item) => (
                      <div className="category-row" key={item.category}>
                        <span
                          className="color-dot"
                          style={{ backgroundColor: getCategoryColor(item.category) }}
                        />
                        <span>{item.category}</span>
                        <strong>{formatCurrency(item.amountInCents)}</strong>
                        <em>{item.percent}%</em>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state stat-empty">
                  <strong>本月暂无收入</strong>
                  <p>新增收入后，这里会显示收入占比。</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="empty-state chart-empty">
            <strong>本月还没有收支记录</strong>
            <p>新增收入或支出后，这里会显示分类统计。</p>
          </div>
        )}
      </section>

      {isDrawerOpen && (
        <div className="drawer-backdrop" role="presentation">
          <aside
            className="transaction-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <div className="drawer-header">
              <div>
                <span className="section-kicker">新增记录</span>
                <h2 id="drawer-title">记一笔收支</h2>
              </div>
              <button type="button" className="ghost-button" onClick={handleCloseDrawer}>
                关闭
              </button>
            </div>

            <form className="expense-form drawer-form" onSubmit={handleSubmit}>
              <fieldset className="type-toggle">
                <legend>类型</legend>
                <label className={transactionType === 'expense' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="transaction-type"
                    value="expense"
                    checked={transactionType === 'expense'}
                    onChange={() => {
                      setTransactionType('expense');
                      setErrorMessage('');
                    }}
                  />
                  支出
                </label>
                <label className={transactionType === 'income' ? 'active' : ''}>
                  <input
                    type="radio"
                    name="transaction-type"
                    value="income"
                    checked={transactionType === 'income'}
                    onChange={() => {
                      setTransactionType('income');
                      setErrorMessage('');
                    }}
                  />
                  收入
                </label>
              </fieldset>

              <label className="amount-field">
                <span>金额</span>
                <div className="amount-input-wrap">
                  <span aria-hidden="true">¥</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value);
                      setErrorMessage('');
                    }}
                    aria-invalid={errorMessage ? 'true' : 'false'}
                    aria-describedby={errorMessage ? 'amount-error' : undefined}
                  />
                </div>
              </label>

              <div className="form-row">
                <label>
                  <span>分类</span>
                  {transactionType === 'expense' ? (
                    <select
                      value={expenseCategory}
                      onChange={(event) =>
                        setExpenseCategory(event.target.value)
                      }
                    >
                      {availableExpenseCategories.map((categoryOption) => (
                        <option key={categoryOption}>{categoryOption}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={incomeCategory}
                      onChange={(event) =>
                        setIncomeCategory(event.target.value)
                      }
                    >
                      {availableIncomeCategories.map((categoryOption) => (
                        <option key={categoryOption}>{categoryOption}</option>
                      ))}
                    </select>
                  )}
                </label>

                <label>
                  <span>日期</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
              </div>

              <label>
                <span>备注</span>
                <textarea
                  rows={3}
                  placeholder={
                    transactionType === 'expense' ? '例如：食堂午餐、打印资料' : '例如：兼职工资、生活费'
                  }
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>

              {errorMessage && (
                <p className="form-error" id="amount-error">
                  {errorMessage}
                </p>
              )}

              <button type="submit">保存{getTypeLabel(transactionType)}</button>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
