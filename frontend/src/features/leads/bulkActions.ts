import { api } from '../../lib/api';

/** Хелперы массовых операций над лидами (только админ). Возвращают число изменённых. */
export async function bulkAssign(ids: string[], assigneeId: string): Promise<number> {
  const { data } = await api.post('/leads/bulk/assign', { ids, assigneeId });
  return data.updated as number;
}
export async function bulkStatus(ids: string[], status: string): Promise<number> {
  const { data } = await api.post('/leads/bulk/status', { ids, status });
  return data.updated as number;
}
export async function bulkDelete(ids: string[]): Promise<number> {
  const { data } = await api.post('/leads/bulk/delete', { ids });
  return data.updated as number;
}
