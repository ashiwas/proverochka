/**
 * Сборка готового КП в PDF: берём выбранные слайды-заготовки (PDF или картинки),
 * складываем их в один документ в нужном порядке и на «слайд с ценой» наносим
 * стоимость (со скидкой и без) в позиции, заданной админом-конструктором.
 *
 * Для кириллицы и знака рубля используется встроенный шрифт DejaVu Sans
 * (лежит в backend/assets/fonts). Если файл шрифта почему-то недоступен —
 * откатываемся на стандартный Helvetica (тогда не-латиница не отрисуется).
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

function readFontBytes(file: string): Uint8Array | null {
  const candidates = [
    path.resolve(__dirname, '../../../assets/fonts', file),
    path.join(process.cwd(), 'assets/fonts', file),
  ];
  for (const p of candidates) {
    try {
      if (existsSync(p)) return new Uint8Array(readFileSync(p));
    } catch {
      /* ignore */
    }
  }
  return null;
}

const FONT_REGULAR = readFontBytes('DejaVuSans.ttf');
const FONT_BOLD = readFontBytes('DejaVuSans-Bold.ttf');

const PDF_MIME = 'application/pdf';
const isPng = (m: string) => m === 'image/png';
const isJpeg = (m: string) => m === 'image/jpeg' || m === 'image/jpg';
export const isSupportedSlideMime = (m: string) => m === PDF_MIME || isPng(m) || isJpeg(m);

/**
 * Форматирование денежной суммы: разряды через неразрывный пробел + знак рубля.
 * 1234567 → "1 234 567 ₽"; дробная часть показывается только если она есть.
 */
export function formatMoney(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const hasFraction = Math.abs(rounded % 1) > 1e-9;
  const abs = Math.abs(rounded);
  const [intPart, fracPart] = abs.toFixed(hasFraction ? 2 : 0).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const sign = rounded < 0 ? '-' : '';
  return `${sign}${grouped}${fracPart ? ',' + fracPart : ''}\u00A0₽`;
}

export interface SlideInput {
  data: Uint8Array | Buffer;
  mimeType: string;
  isPriceSlide: boolean;
  priceX: number;
  priceY: number;
  priceFontSize: number;
  priceAlign: string;
}

export interface ProposalPdfInput {
  slides: SlideInput[];
  priceOriginal?: number | null;
  priceDiscounted?: number | null;
}

/** Габариты слайда (в точках для PDF, в пикселях для картинки) — для превью и позиционирования. */
export async function measureSlide(
  data: Uint8Array | Buffer,
  mimeType: string,
): Promise<{ width: number; height: number }> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (mimeType === PDF_MIME) {
    const doc = await PDFDocument.load(bytes);
    if (doc.getPageCount() === 0) return { width: 0, height: 0 };
    const { width, height } = doc.getPage(0).getSize();
    return { width, height };
  }
  const doc = await PDFDocument.create();
  const img = isPng(mimeType) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  return { width: img.width, height: img.height };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0.5));

function drawPriceBlock(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  slide: SlideInput,
  original?: number | null,
  discounted?: number | null,
) {
  const hasOrig = typeof original === 'number' && Number.isFinite(original);
  const hasDisc = typeof discounted === 'number' && Number.isFinite(discounted);
  if (!hasOrig && !hasDisc) return;

  const { width, height } = page.getSize();
  const anchorX = clamp01(slide.priceX) * width;
  const topY = (1 - clamp01(slide.priceY)) * height;
  const size = Math.min(200, Math.max(6, slide.priceFontSize || 28));
  const align = slide.priceAlign === 'left' || slide.priceAlign === 'right' ? slide.priceAlign : 'center';

  type Line = { text: string; size: number; font: PDFFont; strike?: boolean; color: ReturnType<typeof rgb> };
  const lines: Line[] = [];
  if (hasOrig && hasDisc) {
    // Старая цена зачёркнута и приглушена, новая — крупная и жирная.
    lines.push({ text: formatMoney(original as number), size: size * 0.62, font, strike: true, color: rgb(0.5, 0.5, 0.5) });
    lines.push({ text: formatMoney(discounted as number), size, font: bold, color: rgb(0.1, 0.1, 0.1) });
  } else {
    lines.push({ text: formatMoney((hasDisc ? discounted : original) as number), size, font: bold, color: rgb(0.1, 0.1, 0.1) });
  }

  let cursorTop = topY;
  for (const ln of lines) {
    const textWidth = ln.font.widthOfTextAtSize(ln.text, ln.size);
    let x = anchorX;
    if (align === 'center') x = anchorX - textWidth / 2;
    else if (align === 'right') x = anchorX - textWidth;
    const baseline = cursorTop - ln.size;
    page.drawText(ln.text, { x, y: baseline, size: ln.size, font: ln.font, color: ln.color });
    if (ln.strike) {
      const strikeY = baseline + ln.size * 0.32;
      page.drawLine({
        start: { x, y: strikeY },
        end: { x: x + textWidth, y: strikeY },
        thickness: Math.max(1, ln.size * 0.06),
        color: ln.color,
      });
    }
    cursorTop -= ln.size * 1.35;
  }
}

export async function buildProposalPdf(input: ProposalPdfInput): Promise<Uint8Array> {
  const out = await PDFDocument.create();

  let font: PDFFont;
  let bold: PDFFont;
  if (FONT_REGULAR) {
    out.registerFontkit(fontkit);
    font = await out.embedFont(FONT_REGULAR, { subset: true });
    bold = FONT_BOLD ? await out.embedFont(FONT_BOLD, { subset: true }) : font;
  } else {
    font = await out.embedFont(StandardFonts.Helvetica);
    bold = await out.embedFont(StandardFonts.HelveticaBold);
  }

  for (const slide of input.slides) {
    const bytes = slide.data instanceof Uint8Array ? slide.data : new Uint8Array(slide.data);
    let anchorPage: PDFPage | null = null;

    if (slide.mimeType === PDF_MIME) {
      const src = await PDFDocument.load(bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p, i) => {
        out.addPage(p);
        if (i === 0) anchorPage = p;
      });
    } else if (isPng(slide.mimeType) || isJpeg(slide.mimeType)) {
      const img = isPng(slide.mimeType) ? await out.embedPng(bytes) : await out.embedJpg(bytes);
      const page = out.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      anchorPage = page;
    } else {
      continue; // неподдерживаемый тип — пропускаем
    }

    if (slide.isPriceSlide && anchorPage) {
      drawPriceBlock(anchorPage, font, bold, slide, input.priceOriginal, input.priceDiscounted);
    }
  }

  if (out.getPageCount() === 0) {
    const page = out.addPage();
    page.drawText('Нет слайдов для КП', { x: 56, y: 760, size: 18, font });
  }

  return out.save();
}
