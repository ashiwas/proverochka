export type ExtraPhone = { name: string; phone: string };

/** Привести доп. телефоны к виду [{name, phone}], выкинуть пустые. */
export function normalizeExtraPhones(value: unknown): ExtraPhone[] {
  if (!Array.isArray(value)) return [];
  const out: ExtraPhone[] = [];
  for (const item of value) {
    if (item && typeof item === 'object' && 'phone' in (item as any)) {
      const phone = String((item as any).phone || '').trim();
      if (phone) out.push({ name: String((item as any).name || '').trim(), phone });
    } else if (typeof item === 'string' && item.trim()) {
      // на случай старых данных в виде простого массива строк
      out.push({ name: '', phone: item.trim() });
    }
  }
  return out;
}

export const onlyDigits = (s: string) => s.replace(/\D/g, '');

/**
 * Строка для индексированного поиска по телефону: цифры всех номеров через пробел.
 * Хранится в Lead.phoneSearch и обновляется при каждом сохранении.
 */
export function computePhoneSearch(mainPhone: string, extraPhones: unknown): string {
  const phones = [mainPhone, ...normalizeExtraPhones(extraPhones).map((p) => p.phone)];
  return phones.map(onlyDigits).filter(Boolean).join(' ');
}

/** Совпадает ли искомый номер с любым телефоном лида (main + extra) — для проверок в памяти. */
export function leadMatchesPhone(lead: { mainPhone: string; extraPhones: unknown }, raw: string): boolean {
  const q = onlyDigits(raw);
  if (!q) return false;
  const phones = [lead.mainPhone, ...normalizeExtraPhones(lead.extraPhones).map((p) => p.phone)];
  return phones.some((p) => onlyDigits(p).includes(q));
}
