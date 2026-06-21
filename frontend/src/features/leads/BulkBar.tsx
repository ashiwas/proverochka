import { useState } from 'react';
import type { User } from '../../lib/types';
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from '../../lib/labels';
import { Button, Select } from '../../components/ui';

/** Панель массовых действий над выбранными лидами (общая для списка и воронки). */
export function BulkBar({
  count, managers, onAssign, onStatus, onDelete, onClear,
}: {
  count: number;
  managers: User[];
  onAssign: (assigneeId: string) => void;
  onStatus: (status: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState('');

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
      <span className="text-sm font-semibold text-brand-700">Выбрано: {count}</span>
      <span className="mx-1 h-5 w-px bg-brand-200" />

      <Select className="w-52" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
        <option value="">Назначить менеджера…</option>
        {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </Select>
      <Button size="sm" disabled={!assigneeId} onClick={() => onAssign(assigneeId)}>Назначить</Button>

      <span className="mx-1 h-5 w-px bg-brand-200" />
      <Select className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Сменить статус…</option>
        {LEAD_STATUS_ORDER.map((s) => <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>)}
      </Select>
      <Button size="sm" disabled={!status} onClick={() => onStatus(status)}>Применить</Button>

      <span className="mx-1 h-5 w-px bg-brand-200" />
      <Button size="sm" variant="danger" onClick={onDelete}>Удалить</Button>
      <Button size="sm" variant="ghost" onClick={onClear}>Снять выделение</Button>
    </div>
  );
}
