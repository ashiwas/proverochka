import { useCallback, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../store/auth';
import { downloadProposalPdf } from '../lib/download';
import type { Proposal, ProposalSlide } from '../lib/types';
import { fmtDateTime, formatPrice } from '../lib/format';
import { flash } from '../lib/toast';
import { Button, cx } from '../components/ui';
import { SlideConstructor } from '../features/proposals/SlideConstructor';
import { ProposalBuilder } from '../features/proposals/ProposalBuilder';

export default function ProposalsPage() {
  const isAdmin = useAuth((s) => s.isAdmin)();
  const [tab, setTab] = useState<'proposals' | 'slides'>('proposals');
  const [slides, setSlides] = useState<ProposalSlide[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadSlides = useCallback(async () => {
    try { const { data } = await api.get('/proposals/slides'); setSlides(data); }
    catch (e) { setError(apiError(e)); }
  }, []);
  const loadProposals = useCallback(async () => {
    try { const { data } = await api.get('/proposals'); setProposals(data); }
    catch (e) { setError(apiError(e)); }
  }, []);

  useEffect(() => { loadSlides(); loadProposals(); }, [loadSlides, loadProposals]);

  const openCreate = () => { setEditing(null); setBuilderOpen(true); };
  const openEdit = (p: Proposal) => { setEditing(p); setBuilderOpen(true); };

  const download = async (p: Proposal) => {
    setBusyId(p.id); setError('');
    try { await downloadProposalPdf(p.id, p.title); }
    catch (e) { setError(apiError(e)); } finally { setBusyId(null); }
  };

  const remove = async (p: Proposal) => {
    if (!confirm(`Удалить КП «${p.title}»?`)) return;
    try { await api.delete(`/proposals/${p.id}`); loadProposals(); }
    catch (e) { setError(apiError(e)); }
  };

  const duplicate = async (p: Proposal) => {
    try {
      await api.post('/proposals', {
        title: `${p.title} (копия)`,
        slideIds: p.slideIds,
        priceOriginal: p.priceOriginal ?? null,
        priceDiscounted: p.priceDiscounted ?? null,
      });
      loadProposals();
      flash('КП продублировано');
    } catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Коммерческие предложения</h1>
        {tab === 'proposals' && <Button onClick={openCreate} disabled={slides.length === 0}>+ Создать КП</Button>}
      </div>

      {isAdmin && (
        <div className="mb-4 flex gap-1 border-b border-line">
          {([['proposals', 'Мои КП'], ['slides', 'Конструктор слайдов']] as ['proposals' | 'slides', string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cx('-mb-px border-b-2 px-4 py-2 text-sm font-medium',
                tab === k ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-soft hover:text-ink')}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === 'slides' && isAdmin ? (
        <SlideConstructor slides={slides} onChanged={loadSlides} />
      ) : (
        <ProposalsList
          proposals={proposals}
          isAdmin={isAdmin}
          busyId={busyId}
          slidesEmpty={slides.length === 0}
          onCreate={openCreate}
          onEdit={openEdit}
          onDownload={download}
          onDuplicate={duplicate}
          onDelete={remove}
        />
      )}

      {builderOpen && (
        <ProposalBuilder
          proposal={editing}
          slides={slides}
          onClose={() => setBuilderOpen(false)}
          onSaved={loadProposals}
        />
      )}
    </div>
  );
}

function ProposalsList({
  proposals, isAdmin, busyId, slidesEmpty, onCreate, onEdit, onDownload, onDuplicate, onDelete,
}: {
  proposals: Proposal[];
  isAdmin: boolean;
  busyId: string | null;
  slidesEmpty: boolean;
  onCreate: () => void;
  onEdit: (p: Proposal) => void;
  onDownload: (p: Proposal) => void;
  onDuplicate: (p: Proposal) => void;
  onDelete: (p: Proposal) => void;
}) {
  if (slidesEmpty && proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface py-12 text-center text-sm text-ink-faint">
        {isAdmin
          ? 'Сначала добавьте слайды во вкладке «Конструктор слайдов» — из них собираются КП.'
          : 'Слайды для КП ещё не загружены администратором. Загляните позже.'}
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface py-12 text-center">
        <p className="text-sm text-ink-faint">У вас пока нет КП.</p>
        <Button className="mt-3" onClick={onCreate}>+ Создать первое КП</Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="bg-elevated text-left text-xs uppercase text-ink-soft">
          <tr>
            <th className="px-4 py-3">Название</th>
            <th className="px-4 py-3">Слайдов</th>
            <th className="px-4 py-3">Стоимость</th>
            {isAdmin && <th className="px-4 py-3">Автор</th>}
            <th className="px-4 py-3">Изменён</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {proposals.map((p) => (
            <tr key={p.id} className="border-t border-line hover:bg-elevated">
              <td className="px-4 py-3 font-medium text-ink">
                {p.title}
                {p.lead && <span className="ml-2 text-xs text-ink-faint">· {p.lead.companyName}</span>}
              </td>
              <td className="px-4 py-3 text-ink-soft">{p.slideCount ?? p.slideIds?.length ?? 0}</td>
              <td className="px-4 py-3 text-ink-soft">
                {p.priceDiscounted != null ? (
                  <span>
                    {p.priceOriginal != null && p.priceOriginal !== p.priceDiscounted && (
                      <span className="mr-1 text-xs text-ink-faint line-through">{formatPrice(p.priceOriginal)}</span>
                    )}
                    <span className="font-medium text-ink">{formatPrice(p.priceDiscounted)}</span>
                  </span>
                ) : p.priceOriginal != null ? (
                  <span className="font-medium text-ink">{formatPrice(p.priceOriginal)}</span>
                ) : <span className="text-ink-faint">—</span>}
              </td>
              {isAdmin && <td className="px-4 py-3 text-ink-soft">{p.author?.name}</td>}
              <td className="px-4 py-3 text-xs text-ink-faint">{fmtDateTime(p.updatedAt)}</td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button size="sm" onClick={() => onDownload(p)} disabled={busyId === p.id}>
                    {busyId === p.id ? '…' : 'Скачать PDF'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit(p)}>Изменить</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDuplicate(p)} title="Дублировать">⧉</Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(p)} title="Удалить">🗑</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
