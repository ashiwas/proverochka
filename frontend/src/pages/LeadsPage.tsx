import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { useManagers } from '../lib/useManagers';
import type { Lead, Paginated } from '../lib/types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '../lib/labels';
import { fmtDateTime } from '../lib/format';
import { flash } from '../lib/toast';
import { TIMEZONES, tzOptionLabel, tzCity, currentTimeInZone, gmtLabelForZone, useNow } from '../lib/timezones';
import { Button, Input, Select, Badge } from '../components/ui';
import { LeadModal } from '../features/leads/LeadModal';
import { LeadFormModal } from '../features/leads/LeadFormModal';
import { LeadImportModal } from '../features/leads/LeadImportModal';
import { BulkBar } from '../features/leads/BulkBar';
import { bulkAssign, bulkStatus, bulkDelete } from '../features/leads/bulkActions';

const EMPTY_FILTERS = { status: '', managerId: '', company: '', phone: '', city: '', timezone: '', taskFilter: 'all' };

export default function LeadsPage() {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const managers = useManagers();
  const now = useNow();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // Массовый выбор (только админ).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Сброс на первую страницу при изменении фильтров.
  useEffect(() => { setPage(1); }, [filters]);
  // Сброс выделения при смене фильтров/страницы.
  useEffect(() => { setSelected(new Set()); }, [filters, page]);

  const load = useCallback(async () => {
    try {
      const params: any = { taskFilter: filters.taskFilter, page, pageSize };
      if (filters.status) params.status = filters.status;
      if (filters.company) params.company = filters.company;
      if (filters.phone) params.phone = filters.phone;
      if (filters.city) params.city = filters.city;
      if (filters.timezone) params.timezone = filters.timezone;
      if (isAdmin && filters.managerId) params.managerId = filters.managerId;
      const { data } = await api.get<Paginated<Lead>>('/leads', { params });
      setLeads(data.items);
      setTotal(data.total);
    } catch (e) { setError(apiError(e)); }
  }, [filters, isAdmin, page]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Удалить лид?')) return;
    try { await api.delete(`/leads/${id}`); load(); } catch (e) { setError(apiError(e)); }
  };

  const setFilter = (patch: Partial<typeof EMPTY_FILTERS>) => setFilters((f) => ({ ...f, ...patch }));
  const hasFilters = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters],
  );

  const colSpan = isAdmin ? 9 : 7;

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
        <Input className="w-44" placeholder="Компания" value={filters.company} onChange={(e) => setFilter({ company: e.target.value })} />
        <Input className="w-36" placeholder="Телефон" value={filters.phone} onChange={(e) => setFilter({ phone: e.target.value })} />
        <Input className="w-36" placeholder="Город" value={filters.city} onChange={(e) => setFilter({ city: e.target.value })} />
        <Select className="w-48" value={filters.timezone} onChange={(e) => setFilter({ timezone: e.target.value })}>
          <option value="">Все таймзоны</option>
          {TIMEZONES.map((t) => <option key={t.iana} value={t.iana}>{tzOptionLabel(t.iana, now)}</option>)}
        </Select>
        <Select className="w-44" value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="">Все статусы</option>
          {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
        </Select>
        <Select className="w-48" value={filters.taskFilter} onChange={(e) => setFilter({ taskFilter: e.target.value })}>
          <option value="all">Все задачи</option>
          <option value="none">Без активных задач</option>
          <option value="active">С активными задачами</option>
          <option value="overdue">С просроченными</option>
        </Select>
        {isAdmin && (
          <Select className="w-48" value={filters.managerId} onChange={(e) => setFilter({ managerId: e.target.value })}>
            <option value="">Все менеджеры</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        )}
        {hasFilters && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Сбросить</Button>}
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

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-left text-xs uppercase text-ink-soft">
            <tr>
              {isAdmin && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Выбрать все на странице"
                    checked={leads.length > 0 && leads.every((l) => selected.has(l.id))}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) leads.forEach((l) => next.add(l.id));
                        else leads.forEach((l) => next.delete(l.id));
                        return next;
                      });
                    }}
                  />
                </th>
              )}
              <th className="px-4 py-3">Компания</th><th className="px-4 py-3">ЛПР</th>
              <th className="px-4 py-3">Телефон</th><th className="px-4 py-3">Город / время</th>
              <th className="px-4 py-3">Статус</th><th className="px-4 py-3">Ответственный</th>
              <th className="px-4 py-3">Изменён</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className={`cursor-pointer border-t border-line hover:bg-elevated ${selected.has(l.id) ? 'bg-brand-50' : ''}`}
                onClick={() => setOpenId(l.id)}
              >
                {isAdmin && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Выбрать лид"
                      checked={selected.has(l.id)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(l.id); else next.delete(l.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                )}
                <td className="px-4 py-3 font-medium">
                  {l.companyName} {l.hasOverdueTasks && <Badge color="red">просрочка</Badge>}
                </td>
                <td className="px-4 py-3 text-ink-soft">{l.contactName}</td>
                <td className="px-4 py-3 text-ink-soft">{l.mainPhone}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {l.city || l.timezone ? (
                    <div>
                      <div>{l.city || tzCity(l.timezone!)}</div>
                      {l.timezone && (
                        <div className="text-xs text-ink-faint">
                          {currentTimeInZone(l.timezone, now)} · {gmtLabelForZone(l.timezone, now)}
                        </div>
                      )}
                    </div>
                  ) : <span className="text-ink-faint">—</span>}
                </td>
                <td className="px-4 py-3"><Badge color="brand">{LEAD_STATUS_LABELS[l.status]}</Badge></td>
                <td className="px-4 py-3 text-ink-soft">{l.assignee?.name}</td>
                <td className="px-4 py-3 text-xs text-ink-faint">{fmtDateTime(l.updatedAt)}</td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  {isAdmin && <Button size="sm" variant="ghost" onClick={() => remove(l.id)}>🗑</Button>}
                </td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-ink-faint">Лидов нет</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-ink-soft">
        <span>Всего: {total}</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Назад</Button>
          <span className="text-xs text-ink-faint">Стр. {page} из {pageCount}</span>
          <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Вперёд →</Button>
        </div>
      </div>

      {openId && <LeadModal leadId={openId} onClose={() => setOpenId(null)} onChanged={load} managers={managers} />}
      <LeadFormModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} managers={managers} />
      <LeadImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} managers={managers} />
    </div>
  );
}
