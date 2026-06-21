export const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** Split an ISO datetime into <input type=date> + <input type=time> values. */
export const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
export const toTimeInput = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const mergeDateTime = (date: string, time: string) => new Date(`${date}T${time || '00:00'}`).toISOString();

/** Денежная сумма: разряды через неразрывный пробел + ₽. 1234567 → "1 234 567 ₽". */
export const formatPrice = (value?: number | null): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 100) / 100;
  const hasFraction = Math.abs(rounded % 1) > 1e-9;
  const [intPart, fracPart] = Math.abs(rounded).toFixed(hasFraction ? 2 : 0).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return `${rounded < 0 ? '-' : ''}${grouped}${fracPart ? ',' + fracPart : ''}\u00A0₽`;
};
