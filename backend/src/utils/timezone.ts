/**
 * Утилиты для работы с таймзонами лида.
 *
 * Таймзона хранится в формате IANA (напр. "Europe/Moscow"). И GMT-смещение,
 * и «текущее время в городе» вычисляются из неё на лету (с учётом перехода на
 * летнее время там, где он есть) — отдельных хранимых значений не требуется.
 */

/** Проверяет, что строка — валидная IANA-таймзона, понятная среде выполнения. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    // Бросит RangeError, если таймзона не поддерживается.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Смещение таймзоны относительно UTC в минутах на заданный момент.
 * Положительное — восточнее Гринвича (напр. Europe/Moscow → 180).
 */
export function gmtOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = Number(p.value);
  // Час «24» в полночь у некоторых сред — нормализуем в 0.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  const minutes = Math.round((asUTC - date.getTime()) / 60000);
  // Нормализуем -0 → 0 (Object.is(-0, 0) === false ломает сравнения).
  return minutes === 0 ? 0 : minutes;
}

/** Человекочитаемая метка смещения: 180 → "GMT+3", -300 → "GMT-5", 330 → "GMT+5:30". */
export function gmtLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, '0')}`;
}
