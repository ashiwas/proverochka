import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import type { Lead, LeadStatus } from '../../lib/types';
import { LEAD_STATUS_ORDER, LEAD_STATUS_LABELS } from '../../lib/labels';
import { LeadCard } from './LeadCard';

interface BoardProps {
  leads: Lead[];
  onOpen: (id: string) => void;
  onMove: (leadId: string, status: LeadStatus) => void;
  now: Date;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function Column({
  status, leads, onOpen, now, selectable, selectedIds, onToggleSelect,
}: { status: LeadStatus; leads: Lead[] } & Omit<BoardProps, 'leads' | 'onMove'>) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-ink-soft">{LEAD_STATUS_LABELS[status]}</span>
        <span className="rounded-full bg-elevated px-2 text-xs font-medium text-ink-soft">{leads.length}</span>
      </div>
      <div ref={setNodeRef} className={`flex-1 space-y-2 rounded-xl p-2 transition ${isOver ? 'bg-brand-50' : 'bg-elevated'}`}>
        {leads.map((l) => (
          <LeadCard
            key={l.id} lead={l} onOpen={onOpen} now={now}
            selectable={selectable} selected={selectedIds?.has(l.id)} onToggleSelect={onToggleSelect}
          />
        ))}
        {leads.length === 0 && <div className="px-2 py-8 text-center text-xs text-ink-faint">Пусто</div>}
      </div>
    </div>
  );
}

export function KanbanBoard({
  leads, onOpen, onMove, now, selectable, selectedIds, onToggleSelect,
}: BoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    const leadId = String(e.active.id);
    const target = e.over?.id as LeadStatus | undefined;
    if (!target) return;
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== target) onMove(leadId, target);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {LEAD_STATUS_ORDER.map((status) => (
          <Column
            key={status} status={status} leads={leads.filter((l) => l.status === status)}
            onOpen={onOpen} now={now} selectable={selectable} selectedIds={selectedIds} onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </DndContext>
  );
}
