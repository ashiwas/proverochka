import { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useTheme } from '../store/theme';
import { api } from '../lib/api';
import { cx } from './ui';

const nav = [
  { to: '/', label: 'Dashboard', icon: '▦', end: true },
  { to: '/kanban', label: 'Воронка', icon: '▤' },
  { to: '/leads', label: 'Лиды', icon: '☰' },
  { to: '/tasks', label: 'Задачи', icon: '✓', overdue: true },
  { to: '/search', label: 'Поиск по базе', icon: '⌕' },
  { to: '/users', label: 'Пользователи', icon: '◍', adminOnly: true },
  { to: '/profile', label: 'Профиль', icon: '◌' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [overdue, setOverdue] = useState(0);

  const loadOverdue = useCallback(async () => {
    try {
      const { data } = await api.get('/tasks', { params: { scope: 'overdue' } });
      setOverdue(Array.isArray(data) ? data.length : 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadOverdue();
    const id = setInterval(loadOverdue, 60_000);
    const onFocus = () => loadOverdue();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus); };
  }, [loadOverdue]);

  const onLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-col border-r border-line bg-surface">
        <div className="px-5 py-5 text-lg font-extrabold tracking-tight text-brand-700">UPRES</div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.filter((n) => !n.adminOnly || user?.role === 'ADMIN').map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-elevated')}
            >
              <span className="text-base">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {n.overdue && overdue > 0 && (
                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white">
                  {overdue}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <button
            onClick={toggle}
            className="mb-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-soft hover:bg-elevated"
          >
            <span className="text-base">{theme === 'dark' ? '\u2600' : '\u263e'}</span>
            {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          </button>
          <div className="text-sm font-medium text-ink">{user?.name}</div>
          <div className="text-xs text-ink-faint">{user?.role === 'ADMIN' ? 'Администратор' : 'Менеджер'}</div>
          <button onClick={onLogout} className="mt-3 text-sm text-red-600 hover:underline">Выйти</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto"><div className="p-6"><Outlet /></div></main>
    </div>
  );
}
