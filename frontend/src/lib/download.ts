import { api } from './api';

/** Предпросмотр КП без сохранения: вернёт object-URL собранного PDF (освободите URL потом). */
export async function fetchPreviewUrl(payload: {
  slideIds: string[];
  priceOriginal: number | null;
  priceDiscounted: number | null;
}): Promise<string> {
  const { data } = await api.post('/proposals/preview-pdf', payload, { responseType: 'blob' });
  return URL.createObjectURL(data);
}

/** Скачать готовый КП в PDF: тянем blob с авторизацией и сохраняем файлом. */
export async function downloadProposalPdf(proposalId: string, title: string): Promise<void> {
  const { data } = await api.get(`/proposals/${proposalId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  const safe = (title || 'КП').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
  a.download = `${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
