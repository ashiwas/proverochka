import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { cx } from '../../components/ui';
import { formatPrice } from '../../lib/format';
import type { ProposalSlide, PriceAlign } from '../../lib/types';

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
  slide, x, y, onPick, fontSize, color, align, original, discounted,
}: {
  slide: ProposalSlide;
  x: number;
  y: number;
  onPick: (x: number, y: number) => void;
  fontSize: number;
  color: string;
  align: PriceAlign;
  original: number | null;
  discounted: number | null;
}) {
  const url = useSlideFile(slide.id);
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [widthPx, setWidthPx] = useState(0);
  const ratio = slide.pageWidth > 0 && slide.pageHeight > 0 ? slide.pageHeight / slide.pageWidth : 1.414;

  // Ширина превью в пикселях — чтобы перевести размер шрифта из точек страницы в px (WYSIWYG).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidthPx(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const place = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    onPick(Number(nx.toFixed(4)), Number(ny.toFixed(4)));
  };
  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    place(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => { if (dragging) place(e.clientX, e.clientY); };
  const onUp = (e: React.PointerEvent) => {
    setDragging(false);
    try { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId); } catch { /* ignore */ }
  };

  const pageW = slide.pageWidth > 0 ? slide.pageWidth : 595;
  const pxSize = widthPx > 0 ? (fontSize * widthPx) / pageW : fontSize;
  const hasOrig = original != null;
  const hasDisc = discounted != null;
  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  const textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-line bg-elevated" style={{ paddingBottom: `${ratio * 100}%` }}>
      {/* Слой со слайдом — только визуальный, события не ловит. */}
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
      {/* Прозрачный слой: клик ставит позицию, перетаскивание двигает цену. */}
      <div
        ref={ref}
        className={`absolute inset-0 touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {/* Живой образец цены — как будет в PDF. */}
        <div
          className="pointer-events-none absolute whitespace-nowrap font-bold leading-tight drop-shadow-sm"
          style={{
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            transform: `translateX(${translateX})`,
            textAlign: textAlign as any,
          }}
        >
          {hasOrig && hasDisc ? (
            <>
              <div style={{ fontSize: pxSize * 0.62, color: '#808080', textDecoration: 'line-through' }}>
                {formatPrice(original)}
              </div>
              <div style={{ fontSize: pxSize, color }}>{formatPrice(discounted)}</div>
            </>
          ) : hasOrig || hasDisc ? (
            <div style={{ fontSize: pxSize, color }}>{formatPrice(hasDisc ? discounted : original)}</div>
          ) : (
            <div style={{ fontSize: pxSize, color }} className="opacity-70">0 ₽</div>
          )}
        </div>
      </div>
    </div>
  );
}
