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
