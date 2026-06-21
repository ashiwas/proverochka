import { useState } from 'react';
import { api, apiError } from '../../lib/api';
import type { ProposalSlide, PriceAlign } from '../../lib/types';
import { Modal } from '../../components/Modal';
import { Button, Input, Field, Select, Badge } from '../../components/ui';
import { SlidePreview, PricePlacementPreview } from './SlidePreview';

const ALIGN_LABELS: Record<PriceAlign, string> = { left: 'По левому краю', center: 'По центру', right: 'По правому краю' };

export function SlideConstructor({ slides, onChanged }: { slides: ProposalSlide[]; onChanged: () => void }) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalSlide | null>(null);
  const [error, setError] = useState('');

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const order = slides.map((s) => s.id);
    [order[index], order[target]] = [order[target], order[index]];
    try { await api.post('/proposals/slides/reorder', { order }); onChanged(); }
    catch (e) { setError(apiError(e)); }
  };

  const remove = async (s: ProposalSlide) => {
    if (!confirm(`Удалить слайд «${s.title}»?`)) return;
    try { await api.delete(`/proposals/slides/${s.id}`); onChanged(); }
    catch (e) { setError(apiError(e)); }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">Конструктор слайдов</h2>
          <p className="text-xs text-ink-faint">
            Загрузите слайды-заготовки (PDF или картинки). Один из слайдов отметьте «слайдом с ценой»
            и укажите, где будет печататься стоимость.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>+ Добавить слайд</Button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {slides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface py-10 text-center text-sm text-ink-faint">
          Слайдов пока нет. Добавьте первый, чтобы менеджеры могли собирать из них КП.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {slides.map((s, i) => (
            <div key={s.id} className="overflow-hidden rounded-xl border border-line bg-surface">
              <div className="relative h-44 bg-elevated">
                <SlidePreview slide={s} />
                {s.isPriceSlide && (
                  <div className="absolute left-2 top-2"><Badge color="amber">Слайд с ценой</Badge></div>
                )}
              </div>
              <div className="p-3">
                <div className="truncate text-sm font-medium text-ink" title={s.title}>{s.title}</div>
                <div className="truncate text-xs text-ink-faint">{s.fileName}</div>
                <div className="mt-2 flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => move(i, -1)} disabled={i === 0} title="Выше">↑</Button>
                  <Button size="sm" variant="outline" onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="Ниже">↓</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>Настроить</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(s)} title="Удалить">🗑</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={onChanged} />
      {editing && <SlideEditModal slide={editing} onClose={() => setEditing(null)} onSaved={onChanged} />}
    </div>
  );
}

function SlideUploadModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isPriceSlide, setIsPriceSlide] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => { setFile(null); setTitle(''); setIsPriceSlide(false); setError(''); };

  const submit = async () => {
    if (!file) { setError('Выберите файл слайда'); return; }
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', title || file.name.replace(/\.[^.]+$/, ''));
      fd.append('isPriceSlide', String(isPriceSlide));
      await api.post('/proposals/slides', fd);
      onUploaded(); reset(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Добавить слайд">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="space-y-3">
        <div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              Выбрать файл
            </span>
            <input
              type="file" accept="application/pdf,image/png,image/jpeg" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                e.target.value = '';
              }}
            />
          </label>
          {file && <span className="ml-2 text-sm text-ink-faint">{file.name}</span>}
          <p className="mt-1 text-xs text-ink-faint">Поддерживаются PDF, PNG, JPEG (до 30 МБ).</p>
        </div>
        <Field label="Название слайда *">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, Титульный лист" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={isPriceSlide} onChange={(e) => setIsPriceSlide(e.target.checked)} />
          Это слайд с ценой (на него будет наноситься стоимость)
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={submit} disabled={loading || !file || !title}>{loading ? 'Загрузка…' : 'Добавить'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function SlideEditModal({ slide, onClose, onSaved }: { slide: ProposalSlide; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(slide.title);
  const [isPriceSlide, setIsPriceSlide] = useState(slide.isPriceSlide);
  const [x, setX] = useState(slide.priceX);
  const [y, setY] = useState(slide.priceY);
  const [fontSize, setFontSize] = useState(slide.priceFontSize);
  const [align, setAlign] = useState<PriceAlign>(slide.priceAlign);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setError(''); setLoading(true);
    try {
      await api.patch(`/proposals/slides/${slide.id}`, {
        title,
        isPriceSlide,
        priceX: x,
        priceY: y,
        priceFontSize: fontSize,
        priceAlign: align,
      });
      onSaved(); onClose();
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Слайд: ${slide.title}`} size="lg">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Field label="Название слайда">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={isPriceSlide} onChange={(e) => setIsPriceSlide(e.target.checked)} />
            Слайд с ценой
          </label>

          {isPriceSlide && (
            <>
              <div className="text-xs text-ink-faint">Кликните по слайду справа, чтобы задать положение цены.</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Размер шрифта: ${fontSize}`}>
                  <input type="range" min={10} max={120} value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" />
                </Field>
                <Field label="Выравнивание">
                  <Select value={align} onChange={(e) => setAlign(e.target.value as PriceAlign)}>
                    {(['left', 'center', 'right'] as PriceAlign[]).map((a) => (
                      <option key={a} value={a}>{ALIGN_LABELS[a]}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="text-xs text-ink-faint">
                Позиция: X {Math.round(x * 100)}% · Y {Math.round(y * 100)}%
              </div>
            </>
          )}
        </div>

        <div>
          {isPriceSlide ? (
            <PricePlacementPreview slide={slide} x={x} y={y} onPick={(nx, ny) => { setX(nx); setY(ny); }} />
          ) : (
            <div className="h-72 overflow-hidden rounded-lg border border-line bg-elevated"><SlidePreview slide={slide} /></div>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Отмена</Button>
        <Button onClick={save} disabled={loading || !title}>{loading ? 'Сохранение…' : 'Сохранить'}</Button>
      </div>
    </Modal>
  );
}
