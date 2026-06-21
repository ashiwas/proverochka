import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { formatMoney, measureSlide, buildProposalPdf } from './proposals.pdf';

async function makePdf(width = 595, height = 842): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([width, height]);
  return doc.save();
}

// Разделитель разрядов и отступ перед ₽ — неразрывный пробел (U+00A0).
const S = '\u00A0';

describe('formatMoney', () => {
  it('groups thousands and appends the ruble sign', () => {
    expect(formatMoney(1234567)).toBe(`1${S}234${S}567${S}₽`);
    expect(formatMoney(1000)).toBe(`1${S}000${S}₽`);
    expect(formatMoney(999)).toBe(`999${S}₽`);
    expect(formatMoney(0)).toBe(`0${S}₽`);
  });
  it('keeps the fractional part only when present', () => {
    expect(formatMoney(1234.5)).toBe(`1${S}234,50${S}₽`);
    expect(formatMoney(1234)).toBe(`1${S}234${S}₽`);
  });
});

describe('measureSlide', () => {
  it('reads the PDF page size', async () => {
    const pdf = await makePdf(400, 300);
    const dims = await measureSlide(pdf, 'application/pdf');
    expect(Math.round(dims.width)).toBe(400);
    expect(Math.round(dims.height)).toBe(300);
  });
});

describe('buildProposalPdf', () => {
  it('merges slides into a valid PDF and renders prices (Cyrillic + ruble)', async () => {
    const slidePdf = await makePdf();
    const out = await buildProposalPdf({
      slides: [
        {
          data: slidePdf,
          mimeType: 'application/pdf',
          isPriceSlide: true,
          priceX: 0.5,
          priceY: 0.5,
          priceFontSize: 28,
          priceAlign: 'center',
        },
      ],
      priceOriginal: 100000,
      priceDiscounted: 80000,
    });
    expect(out.length).toBeGreaterThan(100);
    expect(Buffer.from(out.slice(0, 5)).toString('latin1')).toBe('%PDF-');
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it('falls back to a placeholder page when there are no slides', async () => {
    const out = await buildProposalPdf({ slides: [] });
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
