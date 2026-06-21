import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useManagers } from '../lib/useManagers';
import type { Lead, LeadStatus, Paginated } from '../lib/types';
import { flash } from '../lib/toast';
import { TIMEZONES, tzOptionLabel, useNow } from '../lib/timezones';
import { Button, Input, Select } from '../components/ui';
import { KanbanBoard } from '../features/kanban/KanbanBoard';
import { LeadModal } from '../features/leads/LeadModal';
import { LeadFormModal } from '../features/leads/LeadFormModal';
import { BulkBar } from '../features/leads/BulkBar';
import { bulkAssign, bulkStatus, bulkDelete } from '../features/leads/bulkActions';

const EMPTY = { managerId: '', company: '', phone: '', city: '', timezone: '', taskFilter: 'all' };

export default function KanbanPage() {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const managers = useManagers();
  const now = useNow();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Сброс выделения при смене фильтров.
  useEffect(() => { setSelected(new Set()); }, [filters]);

  const load = useCallback(async () => {
    try {
      // Доске нужны все лиды сразу — берём максимально допустимый размер страницы.
      const params: any = { taskFilter: filters.taskFilter, pageSize: 500 };
      if (isAdmin && filters.managerId) params.managerId = filters.managerId;
      if (filters.company) params.company = filters.company;
      if (filters.phone) params.phone = filters.phone;
      if (filters.city) params.city = filters.city;
      if (filters.timezone) params.timezone = filters.timezone;
      const { data } = await api.get<Paginated<Lead>>('/leads', { params });
      setLeads(data.items);
    } catch (e) { setError(apiError(e)); }
  }, [filters, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const onMove = async (leadId: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l))); // optimistic
    try { await api.patch(`/leads/${leadId}/status`, { status }); } catch (e) { setError(apiError(e)); load(); }
  };

  const setFilter = (patch: Partial<typeof EMPTY>) => setFilters((f) => ({ ...f, ...patch }));
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Воронка</h1>
        <Button onClick={() => setCreateOpen(true)}>+ Новый лид</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-44" placeholder="Компания" value={filters.company} onChange={(e) => setFilter({ company: e.target.value })} />
        <Input className="w-36" placeholder="Телефон" value={filters.phone} onChange={(e) => setFilter({ phone: e.target.value })} />
        <Input className="w-36" placeholder="Город" value={filters.city} onChange={(e) => setFilter({ city: e.target.value })} />
        <Select className="w-48" value={filters.timezone} onChange={(e) => setFilter({ timezone: e.target.value })}>
          <option value="">Все таймзоны</option>
          {TIMEZONES.map((t) => <option key={t.iana} value={t.iana}>{tzOptionLabel(t.iana, now)}</option>)}
        </Select>
        <Select className="w-52" value={filters.taskFilter} onChange={(e) => setFilter({ taskFilter: e.target.value })}>
          <option value="all">Все лиды</option>
          <option value="none">Без активных задач</option>
          <option value="active">С активными задачами</option>
          <option value="overdue">С просроченными задачами</option>
        </Select>
        {isAdmin && (
          <Select className="w-48" value={filters.managerId} onChange={(e) => setFilter({ managerId: e.target.value })}>
            <option value="">Все менеджеры</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {isAdmin && selected.size > 0 && (
        <BulkBar
          count={selected.size}
          managers={managers}
          onAssign={async (assigneeId) => {
            try { const n = await bulkAssign([...selected], assigneeId); setSelected(new Set()); load(); setError(''); flash(`Переназначено лидов: ${n}`); }
            catch (e) { setError(apiError(e)); }
          }}
          onStatus={async (status) => {
            try { const n = await bulkStatus([...selected], status); setSelected(new Set()); load(); setError(''); flash(`Изменён статус у лидов: ${n}`); }
            catch (e) { setError(apiError(e)); }
          }}
          onDelete={async () => {
            if (!confirm(`Удалить выбранные лиды (${selected.size})?`)) return;
            try { const n = await bulkDelete([...selected]); setSelected(new Set()); load(); setError(''); flash(`Удалено лидов: ${n}`); }
            catch (e) { setError(apiError(e)); }
          }}
          onClear={() => setSelected(new Set())}
        />
      )}

      {isAdmin && (
        <div className="mb-2 text-xs text-ink-faint">
          Отметьте карточки галочкой, чтобы массово сменить ответственного, статус или удалить.
        </div>
      )}

      <KanbanBoard
        leads={leads} onOpen={setOpenId} onMove={onMove} now={now}
        selectable={isAdmin} selectedIds={selected} onToggleSelect={toggleSelect}
      />

      {openId && <LeadModal leadId={openId} onClose={() => setOpenId(null)} onChanged={load} managers={managers} />}
      <LeadFormModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} managers={managers} />
    </div>
  );
}
