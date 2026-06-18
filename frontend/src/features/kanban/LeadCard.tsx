import { useDraggable } from '@dnd-kit/core';
import type { Lead } from '../../lib/types';
import { TASK_TYPE_LABELS } from '../../lib/labels';
import { fmtDateTime } from '../../lib/format';
import { Badge } from '../../components/ui';

export function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`cursor-grab rounded-xl border bg-surface p-3 shadow-sm transition active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''} ${lead.hasOverdueTasks ? 'border-red-300' : 'border-line'}`}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-ink">{lead.companyName}</div>
        {lead.hasOverdueTasks && <Badge color="red">просрочка</Badge>}
      </div>
      <div className="mt-0.5 text-sm text-ink-soft">{lead.contactName}</div>
      <div className="text-xs text-ink-faint">{lead.mainPhone}</div>

      {lead.nextTask ? (
        <div className="mt-2 rounded-lg bg-elevated px-2 py-1 text-xs text-ink-soft">
          <span className="font-medium">{TASK_TYPE_LABELS[lead.nextTask.type]}:</span>{' '}
          {fmtDateTime(lead.nextTask.dueAt)}
        </div>
      ) : (
        <div className="mt-2 text-xs text-ink-faint">Нет активных задач</div>
      )}

      <div className="mt-2 text-xs text-brand-600">{lead.assignee?.name}</div>
    </div>
  );
}
