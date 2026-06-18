import { useState } from 'react';
import { api, apiError } from '../lib/api';
import { useManagers } from '../lib/useManagers';
import type { LeadLookupResult } from '../lib/types';
import { LEAD_STATUS_LABELS } from '../lib/labels';
import { Button, Input, Badge } from '../components/ui';
import { LeadModal } from '../features/leads/LeadModal';

export default function SearchPage() {
  const managers = useManagers();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LeadLookupResult[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setError(''); setLoading(true);
    try {
      const { data } = await api.get('/leads/lookup', { params: { query: query.trim() } });
      setResults(data);
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-bold text-ink">Поиск по базе</h1>
      <p className="mb-4 text-sm text-ink-soft">
        Проверьте по названию компании или номеру телефона, не ведёт ли клиента другой менеджер.
        Чужие лиды открыть нельзя — видны только название, статус и ответственный.
      </p>

      <div className="mb-4 flex gap-2">
        <Input
          placeholder="Название компании или телефон"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
          autoFocus
        />
        <Button onClick={search} disabled={loading || !query.trim()}>Найти</Button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {results && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3">Компания</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Ответственный</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">{r.companyName}</td>
                  <td className="px-4 py-3"><Badge color="brand">{LEAD_STATUS_LABELS[r.status]}</Badge></td>
                  <td className="px-4 py-3 text-ink-soft">{r.manager}{r.mine && <span className="ml-1 text-xs text-ink-faint">(вы)</span>}</td>
                  <td className="px-4 py-3 text-right">
                    {r.mine
                      ? <Button size="sm" variant="outline" onClick={() => setOpenId(r.id)}>Открыть</Button>
                      : <span className="inline-flex items-center gap-1 text-xs text-ink-faint" title="Лид ведёт другой менеджер">🔒 нет доступа</span>}
                  </td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-ink-faint">Ничего не найдено</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {openId && <LeadModal leadId={openId} onClose={() => setOpenId(null)} onChanged={search} managers={managers} />}
    </div>
  );
}
