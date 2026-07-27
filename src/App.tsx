import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { migrateLocalStorage } from './api';
import { readLegacyData } from './legacyStorage';
import CategoriesPage from './pages/CategoriesPage';
import CategoryManagerPage from './pages/CategoryManagerPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import OverviewPage from './pages/OverviewPage';
import TransactionsPage from './pages/TransactionsPage';

const navItems = [
  { to: '/', label: '财务概览', end: true },
  { to: '/transactions', label: '收支明细' },
  { to: '/categories', label: '分类统计' },
  { to: '/category-manager', label: '分类管理' },
];

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState('');
  useEffect(() => {
    const legacyData = readLegacyData();
    migrateLocalStorage(legacyData.transactions, legacyData.customCategories)
      .then((result) => {
        if (result.status === 'migrated') setMigrationMessage(`已将 ${result.transactions || 0} 笔旧账目迁移到本机数据库。`);
      })
      .catch(() => setMigrationMessage('本机数据库迁移失败，原浏览器数据仍然保留。'))
      .finally(() => setIsReady(true));
  }, []);
  if (!isReady) return <main className="app-shell"><div className="empty-state"><strong>正在连接本机账本…</strong></div></main>;
  return (
    <div className="finance-app-shell">
      <aside className="app-sidebar" aria-label="主导航">
        <div className="brand-block">
          <strong>学生记账</strong>
          <span>收支管理 App</span>
        </div>

        <nav className="app-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main-area">
        {migrationMessage && <p className="storage-message app-migration-message">{migrationMessage}</p>}
        <header className="mobile-nav-header">
          <div className="brand-block">
            <strong>学生记账</strong>
            <span>收支管理 App</span>
          </div>

          <nav className="app-nav" aria-label="主导航">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/category-manager" element={<CategoryManagerPage />} />
          <Route path="/categories/:type/:category" element={<CategoryDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
