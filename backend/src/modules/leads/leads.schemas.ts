import { z } from 'zod';

const LEAD_STATUSES = ['NEW','DEADLINE_SHIFT','GET_FEEDBACK','WARM','AWAITING_PAYMENT','IN_PROGRESS','CLOSED'] as const;

const optionalUrl = z.union([z.string().url('Некорректная ссылка'), z.literal('')]).optional().nullable();

// Каждый доп. телефон: имя контакта + номер.
export const extraPhoneSchema = z.object({
  name: z.string().max(120).optional().default(''),
  phone: z.string().min(1, 'Укажите номер'),
});
const extraPhonesArray = z.array(extraPhoneSchema).optional().default([]);

export const createLeadSchema = z.object({
  companyName: z.string().min(1, 'Укажите компанию'),
  contactName: z.string().min(1, 'Укажите ЛПР'),
  mainPhone: z.string().min(1, 'Укажите телефон'),
  extraPhones: extraPhonesArray,
  website: optionalUrl,
  yandexMapsUrl: optionalUrl,
  twoGisUrl: optionalUrl,
  assigneeId: z.string().uuid().optional(), // admin only; manager -> self
});

export const updateLeadSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  mainPhone: z.string().min(1).optional(),
  extraPhones: z.array(extraPhoneSchema).optional(),
  website: optionalUrl,
  yandexMapsUrl: optionalUrl,
  twoGisUrl: optionalUrl,
});

export const statusSchema = z.object({ status: z.enum(LEAD_STATUSES) });
export const assignSchema = z.object({ assigneeId: z.string().uuid() });

export const leadQuerySchema = z.object({
  managerId: z.string().uuid().optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  // taskFilter: all | none | active | overdue
  taskFilter: z.enum(['all', 'none', 'active', 'overdue']).optional().default('all'),
});

// Глобальный поиск по базе (доступен всем): по названию ИЛИ телефону.
export const lookupQuerySchema = z.object({
  query: z.string().min(1, 'Введите запрос'),
});

// Массовый импорт лидов из Excel (строки парсятся на фронтенде).
// Ссылки здесь проверяем мягко (любая строка), чтобы одна «кривая» строка не валила весь импорт.
const importUrl = z.string().optional().nullable();

export const importLeadsSchema = z.object({
  assigneeId: z.string().uuid().optional(), // admin only — общий ответственный
  leads: z.array(
    z.object({
      companyName: z.string().min(1),
      contactName: z.string().min(1),
      mainPhone: z.string().min(1),
      extraPhones: extraPhonesArray,
      website: importUrl,
      yandexMapsUrl: importUrl,
      twoGisUrl: importUrl,
      assigneeId: z.string().uuid().optional(),
    }),
  ).min(1, 'Нет строк для импорта').max(2000, 'Слишком много строк за один импорт'),
});
