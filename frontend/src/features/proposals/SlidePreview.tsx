import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { cx } from '../../components/ui';
import type { ProposalSlide } from '../../lib/types';

/**
 * Загружает файл слайда (PDF/картинку) с авторизацией и отдаёт object-URL.
 * URL освобождается при размонтировании/смене слайда.
 */
export function useSlideFile(slideId: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!slideId) { setUrl(null); return; }
    let cancelled = false;
    let obj: string | null = null;
    api
      .get(`/proposals/slides/${slideId}/file`, { responseType: 'blob' })
      .then((r) => {
        if (cancelled) return;
        obj = URL.createObjectURL(r.data);
        setUrl(obj);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [slideId]);
  return url;
}

const isPdf = (m: string) => m === 'application/pdf';

/** Простое превью слайда (без интерактива) — для списков и билдера. */
export function SlidePreview({ slide, className }: { slide: ProposalSlide; className?: string }) {
  const url = useSlideFile(slide.id);
  if (!url) {
    return (
      <div className={cx('flex items-center justify-center bg-elevated text-xs text-ink-faint', className)}>
        Загрузка…
      </div>
    );
  }
  if (isPdf(slide.mimeType)) {
    return (
      <embed
        src={`${url}#toolbar=0&navpanes=0&scrollbar=0`}
        type="application/pdf"
        className={cx('h-full w-full', className)}
      />
    );
  }
  return <img src={url} alt={slide.title} className={cx('h-full w-full object-contain', className)} />;
}

/**
 * Интерактивное превью «слайда с ценой»: показывает слайд в верной пропорции и
 * позволяет кликом задать точку, где появится цена. Поверх PDF/картинки лежит
 * прозрачный слой, который и ловит клики (PDF под ним — только для вида).
 */
export function PricePlacementPreview({
  slide, x, y, onPick,
}: {
  slide: ProposalSlide;
  x: number;
  y: number;
  onPick: (x: number, y: number) => void;
}) {
  const url = useSlideFile(slide.id);
  const ref = useRef<HTMLDivElement>(null);
  const ratio = slide.pageWidth > 0 && slide.pageHeight > 0 ? slide.pageHeight / slide.pageWidth : 1.414;

  const pick = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onPick(Number(nx.toFixed(4)), Number(ny.toFixed(4)));
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-line bg-elevated" style={{ paddingBottom: `${ratio * 100}%` }}>
      {/* Слой со слайдом — только визуальный, клики не ловит. */}
      <div className="pointer-events-none absolute inset-0">
        {url ? (
          isPdf(slide.mimeType) ? (
            <embed src={`${url}#toolbar=0&navpanes=0&scrollbar=0`} type="application/pdf" className="h-full w-full" />
          ) : (
            <img src={url} alt={slide.title} className="h-full w-full object-contain" />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-ink-faint">Загрузка…</div>
        )}
      </div>
      {/* Прозрачный слой для выбора позиции. */}
      <div ref={ref} className="absolute inset-0 cursor-crosshair" onClick={pick}>
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        >
          <div className="flex flex-col items-center">
            <div className="h-4 w-4 rounded-full border-2 border-white bg-brand-600 shadow" />
            <span className="mt-0.5 rounded bg-brand-600 px-1 text-[10px] font-medium text-white">цена</span>
          </div>
        </div>
      </div>
    </div>
  );
}
