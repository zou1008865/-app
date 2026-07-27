import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import CategoriesPage from './pages/CategoriesPage';
import CategoryDetailPage from './pages/CategoryDetailPage';
import OverviewPage from './pages/OverviewPage';
import TransactionsPage from './pages/TransactionsPage';

const navItems = [
  { to: '/', label: '财务概览', end: true },
  { to: '/transactions', label: '收支明细' },
  { to: '/categories', label: '分类统计' },
];

export default function App() {
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
          <Route path="/categories/:type/:category" element={<CategoryDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
