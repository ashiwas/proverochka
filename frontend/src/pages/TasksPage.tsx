import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useManagers } from '../lib/useManagers';
import type { Task } from '../lib/types';
import { TASK_TYPE_LABELS } from '../lib/labels';
import { fmtDateTime } from '../lib/format';
import { Button, Select, Badge } from '../components/ui';
import { LeadModal } from '../features/leads/LeadModal';
import { TaskFormModal } from '../features/tasks/TaskFormModal';

type BucketKey = 'overdue' | 'today' | 'tomorrow' | 'week' | 'month';

const BUCKETS: { key: BucketKey; label: string; accent: string }[] = [
  { key: 'overdue', label: 'Просроченные', accent: 'text-red-600' },
  { key: 'today', label: 'На сегодня', accent: 'text-brand-700' },
  { key: 'tomorrow', label: 'На завтра', accent: 'text-ink' },
  { key: 'week', label: 'На неделе', accent: 'text-ink' },
  { key: 'month', label: 'В этом месяце', accent: 'text-ink' },
];

function bucketOf(task: Task, now: Date): BucketKey {
  const due = new Date(task.dueAt).getTime();
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const endTomorrow = new Date(endToday); endTomorrow.setDate(endTomorrow.getDate() + 1);
  const endWeek = new Date(endToday); endWeek.setDate(endWeek.getDate() + 7);

  if (due < now.getTime()) return 'overdue';
  if (due <= endToday.getTime()) return 'today';
  if (due <= endTomorrow.getTime()) return 'tomorrow';
  if (due <= endWeek.getTime()) return 'week';
  return 'month'; // всё остальное (этот месяц и позже)
}

export default function TasksPage() {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const managers = useManagers();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [managerId, setManagerId] = useState('');
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    try {
      const params: any = { scope: 'pending' };
      if (isAdmin && managerId) params.managerId = managerId;
      const { data } = await api.get('/tasks', { params });
      setTasks(data);
    } catch (e) { setError(apiError(e)); }
  }, [managerId, isAdmin]);
  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const now = new Date();
    const g: Record<BucketKey, Task[]> = { overdue: [], today: [], tomorrow: [], week: [], month: [] };
    for (const t of tasks) g[bucketOf(t, now)].push(t);
    return g;
  }, [tasks]);

  const complete = async (id: string) => {
    try { await api.patch(`/tasks/${id}/complete`); load(); } catch (e) { setError(apiError(e)); }
  };
  const remove = async (id: string) => {
    if (!confirm('Удалить задачу?')) return;
    try { await api.delete(`/tasks/${id}`); load(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Задачи</h1>
        {isAdmin && (
          <Select className="w-52" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">Все менеджеры</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {BUCKETS.map((b) => {
          const list = grouped[b.key];
          return (
            <div key={b.key} className="flex w-72 shrink-0 flex-col">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className={`text-sm font-semibold ${b.accent}`}>{b.label}</span>
                <span className="rounded-full bg-elevated px-2 text-xs font-medium text-ink-soft">{list.length}</span>
              </div>
              <div className={`flex-1 space-y-2 rounded-xl p-2 ${b.key === 'overdue' ? 'bg-red-50/60 dark:bg-red-950/20' : 'bg-elevated/60'}`}>
                {list.length === 0 && <div className="px-2 py-8 text-center text-xs text-ink-faint">Пусто</div>}
                {list.map((t) => (
                  <div key={t.id} className={`rounded-xl border bg-surface p-3 shadow-sm ${t.isOverdue ? 'border-red-300' : 'border-line'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{TASK_TYPE_LABELS[t.type]}</span>
                      {t.isOverdue && <Badge color="red">просрочка</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{t.text}</p>
                    <p className="mt-1 text-xs text-ink-faint">{fmtDateTime(t.dueAt)}</p>
                    <button
                      className="mt-1 block text-xs text-brand-700 hover:underline"
                      onClick={() => t.lead && setOpenLeadId(t.lead.id)}
                    >
                      {t.lead?.companyName || 'Лид'}
                    </button>
                    {isAdmin && t.assignee && <div className="text-xs text-ink-faint">{t.assignee.name}</div>}
                    <div className="mt-2 flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => complete(t.id)}>Выполнить</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditTask(t)} title="Изменить">✎</Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(t.id)} title="Удалить">🗑</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {openLeadId && <LeadModal leadId={openLeadId} onClose={() => setOpenLeadId(null)} onChanged={load} managers={managers} />}
      {editTask && (
        <TaskFormModal
          open onClose={() => setEditTask(null)} onSaved={() => { setEditTask(null); load(); }}
          leadId={editTask.leadId} task={editTask}
        />
      )}
    </div>
  );
}
