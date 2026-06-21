import { useEffect, useMemo, useState } from 'react';
import { api, apiError } from '../../lib/api';
import { downloadProposalPdf, fetchPreviewUrl } from '../../lib/download';
import type { Proposal, ProposalSlide } from '../../lib/types';
import { Modal } from '../../components/Modal';
import { Button, Input, Field, Badge, cx } from '../../components/ui';
import { SlidePreview } from './SlidePreview';

const toNum = (s: string): number | null => {
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function ProposalBuilder({
  proposal, slides, onClose, onSaved,
}: {
  proposal: Proposal | null;
  slides: ProposalSlide[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(proposal?.title || '');
  const [selectedIds, setSelectedIds] = useState<string[]>(proposal?.slideIds?.filter((id) => slides.some((s) => s.id === id)) || []);
  const [priceOriginal, setPriceOriginal] = useState(proposal?.priceOriginal != null ? String(proposal.priceOriginal) : '');
  const [priceDiscounted, setPriceDiscounted] = useState(proposal?.priceDiscounted != null ? String(proposal.priceDiscounted) : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Освобождаем object-URL предпросмотра при замене/закрытии.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const byId = useMemo(() => new Map(slides.map((s) => [s.id, s])), [slides]);
  const selectedSlides = selectedIds.map((id) => byId.get(id)).filter(Boolean) as ProposalSlide[];
  const hasPriceSlide = selectedSlides.some((s) => s.isPriceSlide);
  const hasPrice = !!priceOriginal.trim() || !!priceDiscounted.trim();

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const moveSel = (index: number, dir: -1 | 1) => {
    const t = index + dir;
    if (t < 0 || t >= selectedIds.length) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });
  };

  const buildPayload = () => ({
    title: title.trim(),
    slideIds: selectedIds,
    priceOriginal: toNum(priceOriginal),
    priceDiscounted: toNum(priceDiscounted),
  });

  const persist = async (): Promise<string | null> => {
    const payload = buildPayload();
    if (proposal) {
      await api.patch(`/proposals/${proposal.id}`, payload);
      return proposal.id;
    }
    const { data } = await api.post('/proposals', payload);
    return data.id as string;
  };

  const showPreview = async () => {
    if (selectedIds.length === 0) { setError('Выберите слайды для предпросмотра'); return; }
    setError(''); setPreviewLoading(true);
    try {
      const url = await fetchPreviewUrl({
        slideIds: selectedIds,
        priceOriginal: toNum(priceOriginal),
        priceDiscounted: toNum(priceDiscounted),
      });
      setPreviewUrl(url);
    } catch (e) { setError(apiError(e)); } finally { setPreviewLoading(false); }
  };

  const canSave = title.trim().length > 0 && selectedIds.length > 0;

  const save = async (download: boolean) => {
    if (!canSave) { setError('Укажите название и выберите хотя бы один слайд'); return; }
    setError(''); setLoading(true);
    try {
      const id = await persist();
      if (download && id) await downloadProposalPdf(id, title.trim());
      onSaved(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={proposal ? 'Редактирование КП' : 'Новое КП'} size="xl">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 md:grid-cols-5">
        {/* Доступные слайды */}
        <div className="md:col-span-3">
          <div className="mb-2 text-sm font-semibold text-ink">Слайды ({selectedIds.length} выбрано)</div>
          {slides.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line py-8 text-center text-sm text-ink-faint">
              Слайдов пока нет. Их добавляет администратор в конструкторе.
            </div>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {slides.map((s) => {
                const order = selectedIds.indexOf(s.id);
                const active = order >= 0;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    className={cx(
                      'group relative overflow-hidden rounded-lg border bg-surface text-left transition',
                      active ? 'border-brand-500 ring-2 ring-brand-200' : 'border-line hover:border-brand-300',
                    )}
                  >
                    <div className="relative h-28 bg-elevated">
                      <SlidePreview slide={s} />
                      {active && (
                        <div className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                          {order + 1}
                        </div>
                      )}
                      {s.isPriceSlide && <div className="absolute left-1 top-1"><Badge color="amber">цена</Badge></div>}
                    </div>
                    <div className="truncate px-2 py-1.5 text-xs font-medium text-ink" title={s.title}>{s.title}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Параметры КП */}
        <div className="space-y-3 md:col-span-2">
          <Field label="Название КП *">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, КП для ООО Ромашка" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Цена без скидки">
              <Input value={priceOriginal} onChange={(e) => setPriceOriginal(e.target.value)} placeholder="150000" inputMode="decimal" />
            </Field>
            <Field label="Цена со скидкой">
              <Input value={priceDiscounted} onChange={(e) => setPriceDiscounted(e.target.value)} placeholder="119900" inputMode="decimal" />
            </Field>
          </div>

          {hasPrice && !hasPriceSlide && (
            <div className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-700">
              Вы указали цену, но не выбрали «слайд с ценой». Добавьте его, чтобы стоимость попала в КП.
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-medium text-ink-soft">Порядок слайдов</div>
            {selectedSlides.length === 0 ? (
              <div className="text-xs text-ink-faint">Выберите слайды слева — они появятся здесь.</div>
            ) : (
              <div className="space-y-1">
                {selectedSlides.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-line bg-elevated px-2 py-1.5">
                    <span className="w-5 text-center text-xs font-bold text-brand-700">{i + 1}</span>
                    <span className="flex-1 truncate text-xs text-ink" title={s.title}>{s.title}</span>
                    {s.isPriceSlide && <Badge color="amber">цена</Badge>}
                    <button className="px-1 text-ink-faint hover:text-ink disabled:opacity-30" disabled={i === 0} onClick={() => moveSel(i, -1)} title="Выше">↑</button>
                    <button className="px-1 text-ink-faint hover:text-ink disabled:opacity-30" disabled={i === selectedSlides.length - 1} onClick={() => moveSel(i, 1)} title="Ниже">↓</button>
                    <button className="px-1 text-red-500 hover:text-red-700" onClick={() => toggle(s.id)} title="Убрать">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewUrl && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Предпросмотр PDF</span>
            <button className="text-xs text-ink-faint hover:text-ink" onClick={() => setPreviewUrl(null)}>Скрыть</button>
          </div>
          <embed src={previewUrl} type="application/pdf" className="h-[460px] w-full rounded-lg border border-line" />
        </div>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button variant="outline" onClick={showPreview} disabled={previewLoading || selectedIds.length === 0}>
          {previewLoading ? 'Готовим…' : 'Предпросмотр'}
        </Button>
        <Button variant="outline" onClick={() => save(false)} disabled={loading || !canSave}>Сохранить</Button>
        <Button onClick={() => save(true)} disabled={loading || !canSave}>{loading ? 'Готовим…' : 'Сохранить и скачать PDF'}</Button>
      </div>
    </Modal>
  );
}
