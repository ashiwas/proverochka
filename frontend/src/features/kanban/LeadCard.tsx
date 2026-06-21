import { useDraggable } from '@dnd-kit/core';
import type { Lead } from '../../lib/types';
import { TASK_TYPE_LABELS } from '../../lib/labels';
import { fmtDateTime } from '../../lib/format';
import { currentTimeInZone, gmtLabelForZone, tzCity } from '../../lib/timezones';
import { Badge } from '../../components/ui';

export function LeadCard({
  lead, onOpen, now, selectable, selected, onToggleSelect,
}: {
  lead: Lead;
  onOpen: (id: string) => void;
  now: Date;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  const cityLabel = lead.city || (lead.timezone ? tzCity(lead.timezone) : '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative cursor-grab rounded-xl border bg-surface p-3 shadow-sm transition active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''} ${
        selected ? 'border-brand-500 ring-2 ring-brand-200' : lead.hasOverdueTasks ? 'border-red-300' : 'border-line'}`}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(lead.id)}
    >
      {selectable && (
        <input
          type="checkbox"
          aria-label="Выбрать лид"
          checked={!!selected}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={() => onToggleSelect?.(lead.id)}
          className="absolute right-2 top-2 h-4 w-4 cursor-pointer"
        />
      )}

      <div className="flex items-start justify-between gap-2 pr-5">
        <div className="font-semibold text-ink">{lead.companyName}</div>
        {lead.hasOverdueTasks && !selectable && <Badge color="red">просрочка</Badge>}
      </div>
      <div className="mt-0.5 text-sm text-ink-soft">{lead.contactName}</div>

      {cityLabel || lead.timezone ? (
        <div className="mt-1 flex items-center gap-1 text-xs">
          <span className="text-ink-faint">📍</span>
          <span className="font-medium text-ink-soft">{cityLabel || '—'}</span>
          {lead.timezone && (
            <span className="text-ink-faint">
              · {currentTimeInZone(lead.timezone, now)} ({gmtLabelForZone(lead.timezone, now)})
            </span>
          )}
        </div>
      ) : (
        <div className="mt-1 text-xs text-ink-faint">Город не указан</div>
      )}

      {lead.nextTask ? (
        <div className="mt-2 rounded-lg bg-elevated px-2 py-1 text-xs text-ink-soft">
          <span className="font-medium">{TASK_TYPE_LABELS[lead.nextTask.type]}:</span>{' '}
          {fmtDateTime(lead.nextTask.dueAt)}
        </div>
      ) : (
        <div className="mt-2 text-xs text-ink-faint">Нет активных задач</div>
      )}
    </div>
  );
}
