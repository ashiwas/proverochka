import { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import type { LeadStatus } from '../lib/types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '../lib/labels';
import { StatCard, Spinner } from '../components/ui';

interface ManagerStat { id: string; name: string; leads: number; tasks: number }
interface DashboardData {
  role: 'ADMIN' | 'MANAGER';
  leadsByStatus: Record<LeadStatus, number>;
  overdueTasks: number;
  leadsWithoutTasks: number;
  totalLeads?: number;
  byManager?: ManagerStat[];
  myLeads?: number;
  activeTasks?: number;
  todayTasks?: number;
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data)).catch((e) => setError(apiError(e)));
  }, []);

  if (error) return <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="flex justify-center py-20"><Spinner /></div>;

  const isAdmin = data.role === 'ADMIN';

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Dashboard</h1>
      <p className="mb-5 text-sm text-ink-soft">Здравствуйте, {user?.name}</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard label="Всего лидов" value={data.totalLeads ?? 0} accent />
            <StatCard label="Просроченные задачи" value={data.overdueTasks} />
            <StatCard label="Лиды без активных задач" value={data.leadsWithoutTasks} />
            <StatCard label="Менеджеров" value={data.byManager?.length ?? 0} />
          </>
        ) : (
          <>
            <StatCard label="Мои лиды" value={data.myLeads ?? 0} accent />
            <StatCard label="Активные задачи" value={data.activeTasks ?? 0} />
            <StatCard label="Задачи на сегодня" value={data.todayTasks ?? 0} />
            <StatCard label="Просроченные задачи" value={data.overdueTasks} />
          </>
        )}
      </div>

      <h2 className="mb-3 mt-7 text-sm font-semibold text-ink">Лиды по статусам</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {LEAD_STATUS_ORDER.map((s) => (
          <div key={s} className="rounded-xl border border-line bg-surface p-4">
            <div className="text-2xl font-semibold text-ink">{data.leadsByStatus[s] ?? 0}</div>
            <div className="mt-1 text-xs text-ink-soft">{LEAD_STATUS_LABELS[s]}</div>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <div className="mt-7">
          <StatCard label="Лиды без активных задач" value={data.leadsWithoutTasks} />
        </div>
      )}

      {isAdmin && data.byManager && (
        <>
          <h2 className="mb-3 mt-7 text-sm font-semibold text-ink">По менеджерам</h2>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead className="bg-elevated text-left text-xs uppercase text-ink-soft">
                <tr>
                  <th className="px-4 py-3">Менеджер</th>
                  <th className="px-4 py-3">Лиды</th>
                  <th className="px-4 py-3">Задачи</th>
                </tr>
              </thead>
              <tbody>
                {data.byManager.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{m.leads}</td>
                    <td className="px-4 py-3 text-ink-soft">{m.tasks}</td>
                  </tr>
                ))}
                {data.byManager.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-ink-faint">Менеджеров нет</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
