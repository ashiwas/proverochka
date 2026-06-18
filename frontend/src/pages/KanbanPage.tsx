import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useManagers } from '../lib/useManagers';
import type { Lead, LeadStatus } from '../lib/types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '../lib/labels';
import { Button, Input, Select } from '../components/ui';
import { KanbanBoard } from '../features/kanban/KanbanBoard';
import { LeadModal } from '../features/leads/LeadModal';
import { LeadFormModal } from '../features/leads/LeadFormModal';

export default function KanbanPage() {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const managers = useManagers();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState({ managerId: '', company: '', phone: '', taskFilter: 'all' });

  const load = useCallback(async () => {
    try {
      const params: any = { taskFilter: filters.taskFilter };
      if (isAdmin && filters.managerId) params.managerId = filters.managerId;
      if (filters.company) params.company = filters.company;
      if (filters.phone) params.phone = filters.phone;
      const { data } = await api.get('/leads', { params });
      setLeads(data);
    } catch (e) { setError(apiError(e)); }
  }, [filters, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const onMove = async (leadId: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l))); // optimistic
    try { await api.patch(`/leads/${leadId}/status`, { status }); } catch (e) { setError(apiError(e)); load(); }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Воронка</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Новый лид</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-48" placeholder="Компания" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
        <Input className="w-40" placeholder="Телефон" value={filters.phone} onChange={(e) => setFilters((f) => ({ ...f, phone: e.target.value }))} />
        <Select className="w-56" value={filters.taskFilter} onChange={(e) => setFilters((f) => ({ ...f, taskFilter: e.target.value }))}>
          <option value="all">Все лиды</option>
          <option value="none">Без активных задач</option>
          <option value="active">С активными задачами</option>
          <option value="overdue">С просроченными задачами</option>
        </Select>
        {isAdmin && (
          <Select className="w-52" value={filters.managerId} onChange={(e) => setFilters((f) => ({ ...f, managerId: e.target.value }))}>
            <option value="">Все менеджеры</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <KanbanBoard leads={leads} onOpen={setOpenId} onMove={onMove} />

      {openId && <LeadModal leadId={openId} onClose={() => setOpenId(null)} onChanged={load} managers={managers} />}
      <LeadFormModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} managers={managers} />
    </div>
  );
}
