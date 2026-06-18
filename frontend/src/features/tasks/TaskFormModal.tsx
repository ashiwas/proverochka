import { useState } from 'react';
import { api, apiError } from '../../lib/api';
import type { Task, TaskType } from '../../lib/types';
import { TASK_TYPE_LABELS } from '../../lib/labels';
import { toDateInput, toTimeInput, mergeDateTime } from '../../lib/format';
import { Modal } from '../../components/Modal';
import { Button, Input, Field, Select, Textarea } from '../../components/ui';

export function TaskFormModal({
  open, onClose, onSaved, leadId, task,
}: { open: boolean; onClose: () => void; onSaved: () => void; leadId: string; task?: Task | null }) {
  const [type, setType] = useState<TaskType>(task?.type || 'CALL');
  const [text, setText] = useState(task?.text || '');
  const [date, setDate] = useState(toDateInput(task?.dueAt) || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(toTimeInput(task?.dueAt) || '10:00');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      const payload = { type, text, dueAt: mergeDateTime(date, time) };
      if (task) await api.patch(`/tasks/${task.id}`, payload);
      else await api.post('/tasks', { leadId, ...payload });
      onSaved(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Редактировать задачу' : 'Новая задача'}>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        <Field label="Тип задачи">
          <Select value={type} onChange={(e) => setType(e.target.value as TaskType)}>
            {Object.entries(TASK_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Текст задачи"><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дата"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Время"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={submit} disabled={loading || !text}>Сохранить</Button>
      </div>
    </Modal>
  );
}
