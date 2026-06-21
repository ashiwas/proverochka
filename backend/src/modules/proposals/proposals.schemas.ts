import { z } from 'zod';

const alignEnum = z.enum(['left', 'center', 'right']);

// multipart присылает всё строками: "false" у z.coerce.boolean стало бы true,
// поэтому трактуем явно — только "true"/"1"/true означают истину.
const formBoolean = z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean());

// Метаданные слайда при загрузке (приходят как поля multipart-формы → строки, поэтому coerce).
export const slideCreateSchema = z.object({
  title: z.string().min(1, 'Укажите название слайда').max(200),
  isPriceSlide: formBoolean.optional().default(false),
  priceX: z.coerce.number().min(0).max(1).optional().default(0.5),
  priceY: z.coerce.number().min(0).max(1).optional().default(0.5),
  priceFontSize: z.coerce.number().int().min(6).max(200).optional().default(28),
  priceAlign: alignEnum.optional().default('center'),
  sortOrder: z.coerce.number().int().optional().default(0),
});

// Обновление слайда (JSON) — все поля необязательны.
export const slideUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    isPriceSlide: z.boolean().optional(),
    priceX: z.number().min(0).max(1).optional(),
    priceY: z.number().min(0).max(1).optional(),
    priceFontSize: z.number().int().min(6).max(200).optional(),
    priceAlign: alignEnum.optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Нет полей для обновления');

export const slideReorderSchema = z.object({
  order: z.array(z.string().uuid()).min(1, 'Пустой порядок'),
});

const optionalPrice = z.number().nonnegative('Цена не может быть отрицательной').nullable().optional();

export const proposalCreateSchema = z.object({
  title: z.string().min(1, 'Укажите название КП').max(200),
  slideIds: z.array(z.string().uuid()).min(1, 'Выберите хотя бы один слайд').max(100),
  priceOriginal: optionalPrice,
  priceDiscounted: optionalPrice,
  leadId: z.string().uuid().nullable().optional(),
});

export const proposalUpdateSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    slideIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    priceOriginal: optionalPrice,
    priceDiscounted: optionalPrice,
    leadId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Нет полей для обновления');
