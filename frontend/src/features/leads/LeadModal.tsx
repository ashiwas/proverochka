import { useEffect, useRef, useState } from 'react';
import { api, apiError } from '../../lib/api';
import { useAuth } from '../../store/auth';
import type { Lead, Task, Comment, HistoryEntry, User, LeadStatus, ExtraPhone } from '../../lib/types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER, TASK_TYPE_LABELS, TASK_STATUS_LABELS, HISTORY_LABELS } from '../../lib/labels';
import { fmtDateTime } from '../../lib/format';
import { Modal } from '../../components/Modal';
import { Button, Input, Field, Select, Textarea, Badge, CopyButton, cx } from '../../components/ui';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TimezoneFields } from './TimezoneFields';
import { currentTimeInZone, gmtLabelForZone, tzCity, useNow } from '../../lib/timezones';

export function LeadModal({
  leadId, onClose, onChanged, managers,
}: { leadId: string; onClose: () => void; onChanged: () => void; managers: User[] }) {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState('');
  const [bottom, setBottom] = useState<'tasks' | 'history'>('tasks');

  const load = async () => {
    try { const { data } = await api.get(`/leads/${leadId}`); setLead(data); }
    catch (e) { setError(apiError(e)); }
  };
  useEffect(() => { load(); }, [leadId]);

  const refreshAll = () => { load(); onChanged(); };

  return (
    <Modal
      open onClose={onClose} size="xl"
      title={lead?.companyName || 'Лид'}
      headerRight={lead && <Badge color="brand">{LEAD_STATUS_LABELS[lead.status]}</Badge>}
    >
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {!lead ? <div className="py-10 text-center text-ink-faint">Загрузка…</div> : (
        <div className="grid gap-4 md:grid-cols-5">
          {/* Левая колонка: информация + задачи/история */}
          <div className="space-y-4 md:col-span-3">
            <InfoPanel lead={lead} isAdmin={isAdmin} managers={managers} onChanged={refreshAll} />

            <div className="rounded-xl border border-line bg-surface">
              <div className="flex items-center gap-1 border-b border-line p-2">
                {([['tasks', 'Задачи'], ['history', 'История']] as ['tasks' | 'history', string][]).map(([k, l]) => (
                  <button key={k} onClick={() => setBottom(k)}
                    className={cx('rounded-md px-3 py-1.5 text-sm font-medium',
                      bottom === k ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-elevated')}>{l}</button>
                ))}
              </div>
              <div className="p-3">
                {bottom === 'tasks' ? <TasksPanel lead={lead} onChanged={refreshAll} /> : <HistoryPanel leadId={leadId} />}
              </div>
            </div>
          </div>

          {/* Правая колонка: чат комментариев */}
          <div className="md:col-span-2">
            <CommentsPanel leadId={leadId} isAdmin={isAdmin} />
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Информация о компании ---------- */

function PhoneRow({ name, phone }: { name?: string; phone: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-elevated px-3 py-2">
      <div className="min-w-0">
        <a href={`tel:${phone}`} className="text-sm font-medium text-ink hover:text-brand-700">{phone}</a>
        {name ? <div className="truncate text-xs text-ink-faint">{name}</div> : null}
      </div>
      <CopyButton value={phone} title="Скопировать номер" />
    </div>
  );
}

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-elevated px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-ink-faint">{label}</div>
        <a href={url} target="_blank" rel="noreferrer" className="block truncate text-sm text-brand-700 hover:underline">{url}</a>
      </div>
      <CopyButton value={url} title="Скопировать ссылку" />
    </div>
  );
}

function InfoPanel({ lead, isAdmin, managers, onChanged }: { lead: Lead; isAdmin: boolean; managers: User[]; onChanged: () => void }) {
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [f, setF] = useState({
    companyName: lead.companyName, contactName: lead.contactName, mainPhone: lead.mainPhone,
    website: lead.website || '', yandexMapsUrl: lead.yandexMapsUrl || '', twoGisUrl: lead.twoGisUrl || '',
    city: lead.city || '', timezone: lead.timezone || '',
  });
  const [extra, setExtra] = useState<ExtraPhone[]>(lead.extraPhones || []);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const startEdit = () => {
    setF({
      companyName: lead.companyName, contactName: lead.contactName, mainPhone: lead.mainPhone,
      website: lead.website || '', yandexMapsUrl: lead.yandexMapsUrl || '', twoGisUrl: lead.twoGisUrl || '',
      city: lead.city || '', timezone: lead.timezone || '',
    });
    setExtra(lead.extraPhones || []);
    setEditing(true);
  };

  const save = async () => {
    try {
      await api.patch(`/leads/${lead.id}`, { ...f, extraPhones: extra.filter((e) => e.phone.trim()) });
      setMsg('Сохранено'); setEditing(false); onChanged(); setTimeout(() => setMsg(''), 1500);
    } catch (e) { setMsg(apiError(e)); }
  };
  const changeStatus = async (status: LeadStatus) => { await api.patch(`/leads/${lead.id}/status`, { status }); onChanged(); };
  const reassign = async (assigneeId: string) => { await api.patch(`/leads/${lead.id}/assign`, { assigneeId }); onChanged(); };

  const addPhone = () => setExtra((p) => [...p, { name: '', phone: '' }]);
  const setPhone = (i: number, k: keyof ExtraPhone, v: string) => setExtra((p) => p.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  const removePhone = (i: number) => setExtra((p) => p.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Информация о компании</span>
        {!editing
          ? <Button size="sm" variant="outline" onClick={startEdit}>Редактировать</Button>
          : <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
              <Button size="sm" onClick={save}>Сохранить</Button>
            </div>}
      </div>

      {!editing ? (
        <div className="space-y-3">
          <div>
            <div className="text-xs text-ink-faint">ЛПР</div>
            <div className="text-sm font-medium text-ink">{lead.contactName}</div>
          </div>

          {(lead.city || lead.timezone) && (
            <div>
              <div className="text-xs text-ink-faint">Город и время</div>
              <div className="flex flex-wrap items-center gap-x-2 text-sm">
                <span className="font-medium text-ink">{lead.city || tzCity(lead.timezone!)}</span>
                {lead.timezone && (
                  <span className="text-ink-soft">
                    · сейчас <span className="font-medium text-ink">{currentTimeInZone(lead.timezone, now)}</span>{' '}
                    <span className="text-ink-faint">({gmtLabelForZone(lead.timezone, now)})</span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-xs text-ink-faint">Телефоны</div>
            <PhoneRow phone={lead.mainPhone} name="Основной" />
            {(lead.extraPhones || []).map((p, i) => <PhoneRow key={i} phone={p.phone} name={p.name} />)}
          </div>

          {(lead.website || lead.yandexMapsUrl || lead.twoGisUrl) && (
            <div className="space-y-1.5">
              <div className="text-xs text-ink-faint">Ссылки</div>
              {lead.website && <LinkRow label="Сайт" url={lead.website} />}
              {lead.yandexMapsUrl && <LinkRow label="Яндекс Карты" url={lead.yandexMapsUrl} />}
              {lead.twoGisUrl && <LinkRow label="2ГИС" url={lead.twoGisUrl} />}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Field label="Статус">
              <Select value={lead.status} onChange={(e) => changeStatus(e.target.value as LeadStatus)}>
                {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
              </Select>
            </Field>
            <Field label="Ответственный">
              {isAdmin ? (
                <Select value={lead.assigneeId} onChange={(e) => reassign(e.target.value)}>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </Select>
              ) : <Input value={lead.assignee?.name} disabled />}
            </Field>
          </div>

          <div className="text-xs text-ink-faint">
            Создан: {fmtDateTime(lead.createdAt)} · Изменён: {fmtDateTime(lead.updatedAt)}
          </div>
          {msg && <div className="text-sm text-ink-soft">{msg}</div>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Компания"><Input value={f.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
            <Field label="ЛПР"><Input value={f.contactName} onChange={(e) => set('contactName', e.target.value)} /></Field>
            <Field label="Основной телефон"><Input value={f.mainPhone} onChange={(e) => set('mainPhone', e.target.value)} /></Field>
            <Field label="Сайт"><Input value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://" /></Field>
            <Field label="Яндекс Карты"><Input value={f.yandexMapsUrl} onChange={(e) => set('yandexMapsUrl', e.target.value)} placeholder="https://" /></Field>
            <Field label="2ГИС"><Input value={f.twoGisUrl} onChange={(e) => set('twoGisUrl', e.target.value)} placeholder="https://" /></Field>
            <TimezoneFields city={f.city} timezone={f.timezone} onCity={(v) => set('city', v)} onTimezone={(v) => set('timezone', v)} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-ink-soft">Дополнительные телефоны</span>
              <Button size="sm" variant="outline" onClick={addPhone}>+ Телефон</Button>
            </div>
            <div className="space-y-2">
              {extra.length === 0 && <div className="text-xs text-ink-faint">Можно добавить несколько номеров с подписью (например «Бухгалтерия»).</div>}
              {extra.map((e, i) => (
                <div key={i} className="flex items-end gap-2 rounded-lg border border-line bg-elevated p-2.5">
                  <Field className="w-2/5" label="Имя / отдел">
                    <Input placeholder="Например, Бухгалтерия" value={e.name} onChange={(ev) => setPhone(i, 'name', ev.target.value)} />
                  </Field>
                  <Field className="flex-1" label="Телефон">
                    <Input placeholder="+7 900 000-00-00" value={e.phone} onChange={(ev) => setPhone(i, 'phone', ev.target.value)} />
                  </Field>
                  <Button variant="outline" title="Удалить номер" onClick={() => removePhone(i)}>✕</Button>
                </div>
              ))}
            </div>
          </div>
          {msg && <div className="text-sm text-red-600">{msg}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Задачи лида ---------- */

function TasksPanel({ lead, onChanged }: { lead: Lead; onChanged: () => void }) {
  const [items, setItems] = useState<Task[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const load = async () => { const { data } = await api.get(`/tasks`, { params: { leadId: lead.id } }); setItems(data); };
  useEffect(() => { load(); }, [lead.id]);
  const refresh = () => { load(); onChanged(); };
  const complete = async (id: string) => { await api.patch(`/tasks/${id}/complete`); refresh(); };
  const del = async (id: string) => {
    if (!confirm('Удалить задачу?')) return;
    await api.delete(`/tasks/${id}`); refresh();
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>+ Задача</Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <div className="py-4 text-center text-sm text-ink-faint">Задач нет</div>}
        {items.map((t) => (
          <div key={t.id} className="flex items-start justify-between rounded-lg border border-line p-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{TASK_TYPE_LABELS[t.type]}</span>
                <Badge color={t.derivedStatus === 'DONE' ? 'green' : t.derivedStatus === 'OVERDUE' ? 'red' : 'brand'}>
                  {TASK_STATUS_LABELS[t.derivedStatus]}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-ink-soft">{t.text}</p>
              <p className="text-xs text-ink-faint">{fmtDateTime(t.dueAt)}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {t.status !== 'DONE' && <Button size="sm" variant="ghost" onClick={() => complete(t.id)} title="Выполнить">✓</Button>}
              {t.status !== 'DONE' && <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }} title="Изменить">✎</Button>}
              <Button size="sm" variant="ghost" onClick={() => del(t.id)} title="Удалить">🗑</Button>
            </div>
          </div>
        ))}
      </div>
      {formOpen && <TaskFormModal open onClose={() => setFormOpen(false)} onSaved={refresh} leadId={lead.id} task={editing} />}
    </div>
  );
}

/* ---------- История ---------- */

function HistoryPanel({ leadId }: { leadId: string }) {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  useEffect(() => { api.get(`/leads/${leadId}/history`).then((r) => setItems(r.data)); }, [leadId]);
  return (
    <div className="max-h-72 space-y-2 overflow-y-auto">
      {items.length === 0 && <div className="py-4 text-center text-sm text-ink-faint">История пуста</div>}
      {items.map((h) => (
        <div key={h.id} className="flex items-center justify-between border-b border-line py-2 text-sm">
          <span><span className="font-medium text-ink">{h.user.name}</span> — {HISTORY_LABELS[h.action] || h.action}</span>
          <span className="text-xs text-ink-faint">{fmtDateTime(h.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Чат комментариев ---------- */

function CommentsPanel({ leadId, isAdmin }: { leadId: string; isAdmin: boolean }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => { const { data } = await api.get(`/leads/${leadId}/comments`); setItems(data); };
  useEffect(() => { load(); }, [leadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [items.length]);

  const add = async () => { if (!text.trim()) return; await api.post(`/leads/${leadId}/comments`, { text }); setText(''); load(); };
  const del = async (id: string) => {
    if (!confirm('Удалить комментарий?')) return;
    await api.delete(`/comments/${id}`); load();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add(); }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">Чат</div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ maxHeight: 420, minHeight: 240 }}>
        {items.length === 0 && <div className="py-8 text-center text-sm text-ink-faint">Сообщений пока нет</div>}
        {items.map((c) => (
          <div key={c.id} className="rounded-lg bg-elevated p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink">{c.author.name}</span>
              <span className="text-[11px] text-ink-faint">{fmtDateTime(c.createdAt)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{c.text}</p>
            {isAdmin && <button onClick={() => del(c.id)} className="mt-1 text-[11px] text-red-500 hover:underline">Удалить</button>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line p-3">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} placeholder="Сообщение… (Enter — отправить)" />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={add} disabled={!text.trim()}>Отправить</Button>
        </div>
      </div>
    </div>
  );
}
