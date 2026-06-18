import React from 'react';
import { Button } from './ui';

type Size = 'md' | 'lg' | 'xl';
const WIDTHS: Record<Size, string> = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({
  open, onClose, title, children, wide, size, headerRight,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
  wide?: boolean; size?: Size; headerRight?: React.ReactNode;
}) {
  if (!open) return null;
  const width = WIDTHS[size || (wide ? 'lg' : 'md')];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className={`mt-10 w-full ${width} rounded-2xl bg-surface shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <div className="flex items-center gap-2">
            {headerRight}
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
