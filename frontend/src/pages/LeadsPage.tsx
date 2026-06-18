import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useManagers } from '../lib/useManagers';
import type { Lead } from '../lib/types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '../lib/labels';
import { fmtDateTime } from '../lib/format';
import { Button, Input, Select, Badge } from '../components/ui';
import { LeadModal } from '../features/leads/LeadModal';
import { LeadFormModal } from '../features/leads/LeadFormModal';
import { LeadImportModal } from '../features/leads/LeadImportModal';

export default function LeadsPage() {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const managers = useManagers();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', managerId: '', company: '', phone: '', taskFilter: 'all' });

  const load = useCallback(async () => {
    try {
      const params: any = { taskFilter: filters.taskFilter };
      if (filters.status) params.status = filters.status;
      if (filters.company) params.company = filters.company;
      if (filters.phone) params.phone = filters.phone;
      if (isAdmin && filters.managerId) params.managerId = filters.managerId;
      const { data } = await api.get('/leads', { params });
      setLeads(data);
    } catch (e) { setError(apiError(e)); }
  }, [filters, isAdmin]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Удалить лид?')) return;
    try { await api.delete(`/leads/${id}`); load(); } catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Лиды</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>Импорт из Excel</Button>
          <Button onClick={() => setCreateOpen(true)}>+ Новый лид</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-48" placeholder="Компания" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
        <Input className="w-40" placeholder="Телефон" value={filters.phone} onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))} />
        <Select className="w-48" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">Все статусы</option>
          {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </Select>
        <Select className="w-52" value={filters.taskFilter} onChange={(e) => setFilters((f) => ({ ...f, taskFilter: e.target.value }))}>
          <option value="all">Все задачи</option>
          <option value="none">Без активных задач</option>
          <option value="active">С активными задачами</option>
          <option value="overdue">С просроченными</option>
        </Select>
        {isAdmin && (
          <Select className="w-52" value={filters.managerId} onChange={(e) => setFilters((f) => ({ ...f, managerId: e.target.value }))}>
            <option value="">Все менеджеры</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase text-ink-soft">
            <tr>
              <th className="px-4 py-3">Компания</th><th className="px-4 py-3">ЛПР</th>
              <th className="px-4 py-3">Телефон</th><th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Ответственный</th><th className="px-4 py-3">Изменён</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="cursor-pointer border-t border-line hover:bg-elevated" onClick={() => setOpenId(l.id)}>
                <td className="px-4 py-3 font-medium">
                  {l.companyName} {l.hasOverdueTasks && <Badge color="red">просрочка</Badge>}
                </td>
                <td className="px-4 py-3 text-ink-soft">{l.contactName}</td>
                <td className="px-4 py-3 text-ink-soft">{l.mainPhone}</td>
                <td className="px-4 py-3"><Badge color="brand">{LEAD_STATUS_LABELS[l.status]}</Badge></td>
                <td className="px-4 py-3 text-ink-soft">{l.assignee?.name}</td>
                <td className="px-4 py-3 text-xs text-ink-faint">{fmtDateTime(l.updatedAt)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>🗑</Button>}
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-faint">Лидов нет</td></tr>}
          </tbody>
        </table>
      </div>

      {openId && <LeadModal leadId={openId} onClose={() => setOpenId(null)} onChanged={load} managers={managers} />}
      <LeadFormModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} managers={managers} />
      <LeadImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} managers={managers} />
    </div>
  );
}
