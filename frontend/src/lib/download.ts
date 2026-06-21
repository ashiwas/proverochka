import { api } from './api';

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
