import React from 'react';

export const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');

export function Button({
  variant = 'primary', size = 'md', className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md' }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm' };
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-line bg-surface text-ink-soft hover:bg-elevated',
    ghost: 'text-ink-soft hover:bg-elevated',
  };
  return <button className={cx(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('w-full rounded-lg border border-line bg-surface text-ink placeholder:text-ink-faint px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500', className)} {...p} />;
}

export function Textarea({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('w-full rounded-lg border border-line bg-surface text-ink placeholder:text-ink-faint px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500', className)} {...p} />;
}

export function Select({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx('w-full rounded-lg border border-line bg-surface text-ink px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500', className)} {...p} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'gray' | 'green' | 'red' | 'brand' | 'amber' }) {
  const map = {
    gray: 'bg-elevated text-ink-soft', green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700', brand: 'bg-brand-100 text-brand-700', amber: 'bg-amber-100 text-amber-700',
  };
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', map[color])}>{children}</span>;
}

export function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={cx('rounded-xl border bg-surface p-4', accent ? 'border-brand-200' : 'border-line')}>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-sm text-ink-soft">{label}</div>
    </div>
  );
}

export function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />;
}

/** Кнопка «копировать в один клик» с короткой галочкой-подтверждением. */
export function CopyButton({ value, title }: { value: string; title?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={title || 'Скопировать'}
      className={cx(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs transition',
        copied ? 'bg-green-100 text-green-700' : 'text-ink-faint hover:bg-elevated hover:text-ink-soft',
      )}
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}
