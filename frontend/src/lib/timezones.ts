import { useEffect, useState } from 'react';

/**
 * Таймзоны и города для лидов. Таймзона хранится в формате IANA
 * (напр. "Europe/Moscow"); GMT-смещение и текущее время вычисляются из неё
 * на лету через Intl — отдельных хранимых значений не нужно.
 */

export interface TimezoneInfo {
  iana: string;
  city: string;
}

// Базовый набор: все таймзоны России + ближайшее зарубежье. Список используется
// для фильтра и для выпадающего списка при создании/редактировании лида.
export const TIMEZONES: TimezoneInfo[] = [
  { iana: 'Europe/Kaliningrad', city: 'Калининград' },
  { iana: 'Europe/Moscow', city: 'Москва' },
  { iana: 'Europe/Samara', city: 'Самара' },
  { iana: 'Asia/Yekaterinburg', city: 'Екатеринбург' },
  { iana: 'Asia/Omsk', city: 'Омск' },
  { iana: 'Asia/Novosibirsk', city: 'Новосибирск' },
  { iana: 'Asia/Krasnoyarsk', city: 'Красноярск' },
  { iana: 'Asia/Irkutsk', city: 'Иркутск' },
  { iana: 'Asia/Yakutsk', city: 'Якутск' },
  { iana: 'Asia/Vladivostok', city: 'Владивосток' },
  { iana: 'Asia/Magadan', city: 'Магадан' },
  { iana: 'Asia/Kamchatka', city: 'Петропавловск-Камчатский' },
  { iana: 'Europe/Minsk', city: 'Минск' },
  { iana: 'Europe/Kyiv', city: 'Киев' },
  { iana: 'Asia/Almaty', city: 'Алматы' },
  { iana: 'Asia/Tashkent', city: 'Ташкент' },
  { iana: 'Asia/Tbilisi', city: 'Тбилиси' },
  { iana: 'Asia/Yerevan', city: 'Ереван' },
  { iana: 'Asia/Baku', city: 'Баку' },
];

// Крупные города → таймзона. Помогает автоподстановке зоны при вводе города
// в форме и при импорте из Excel (если в таблице есть колонка «Город»).
export const CITY_TO_TZ: Record<string, string> = {
  'москва': 'Europe/Moscow',
  'санкт-петербург': 'Europe/Moscow',
  'спб': 'Europe/Moscow',
  'питер': 'Europe/Moscow',
  'нижний новгород': 'Europe/Moscow',
  'казань': 'Europe/Moscow',
  'ростов-на-дону': 'Europe/Moscow',
  'краснодар': 'Europe/Moscow',
  'воронеж': 'Europe/Moscow',
  'волгоград': 'Europe/Moscow',
  'сочи': 'Europe/Moscow',
  'тула': 'Europe/Moscow',
  'ярославль': 'Europe/Moscow',
  'калининград': 'Europe/Kaliningrad',
  'самара': 'Europe/Samara',
  'ижевск': 'Europe/Samara',
  'екатеринбург': 'Asia/Yekaterinburg',
  'челябинск': 'Asia/Yekaterinburg',
  'уфа': 'Asia/Yekaterinburg',
  'пермь': 'Asia/Yekaterinburg',
  'тюмень': 'Asia/Yekaterinburg',
  'оренбург': 'Asia/Yekaterinburg',
  'омск': 'Asia/Omsk',
  'новосибирск': 'Asia/Novosibirsk',
  'барнаул': 'Asia/Novosibirsk',
  'томск': 'Asia/Novosibirsk',
  'кемерово': 'Asia/Novosibirsk',
  'новокузнецк': 'Asia/Novosibirsk',
  'красноярск': 'Asia/Krasnoyarsk',
  'иркутск': 'Asia/Irkutsk',
  'улан-удэ': 'Asia/Irkutsk',
  'якутск': 'Asia/Yakutsk',
  'владивосток': 'Asia/Vladivostok',
  'хабаровск': 'Asia/Vladivostok',
  'магадан': 'Asia/Magadan',
  'петропавловск-камчатский': 'Asia/Kamchatka',
  'минск': 'Europe/Minsk',
  'киев': 'Europe/Kyiv',
  'алматы': 'Asia/Almaty',
  'ташкент': 'Asia/Tashkent',
  'тбилиси': 'Asia/Tbilisi',
  'ереван': 'Asia/Yerevan',
  'баку': 'Asia/Baku',
};

/** Список названий городов для подсказок (datalist). */
export const CITY_SUGGESTIONS = Object.keys(CITY_TO_TZ)
  .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
  .sort((a, b) => a.localeCompare(b, 'ru'));

/** Подобрать таймзону по названию города (или '' если не нашли). */
export function guessTimezone(city: string): string {
  if (!city) return '';
  return CITY_TO_TZ[city.trim().toLowerCase()] || '';
}

/** Валидна ли строка как IANA-таймзона. */
export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Смещение зоны относительно UTC в минутах на заданный момент. */
export function gmtOffsetMinutes(timeZone: string, date: Date = new Date()): number {
  try {
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
    const map: Record<string, number> = {};
    for (const p of dtf.formatToParts(date)) if (p.type !== 'literal') map[p.type] = Number(p.value);
    const hour = map.hour === 24 ? 0 : map.hour;
    const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
    const minutes = Math.round((asUTC - date.getTime()) / 60000);
    return minutes === 0 ? 0 : minutes;
  } catch {
    return 0;
  }
}

/** Человекочитаемое смещение: 180 → "GMT+3", 330 → "GMT+5:30". */
export function gmtLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, '0')}`;
}

/** "GMT+3" для таймзоны прямо сейчас. */
export function gmtLabelForZone(timeZone: string, date: Date = new Date()): string {
  return gmtLabel(gmtOffsetMinutes(timeZone, date));
}

/** Текущее время в зоне в формате ЧЧ:ММ. */
export function currentTimeInZone(timeZone: string, date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date);
  } catch {
    return '—';
  }
}

/** Город таймзоны из справочника (для подписи в выпадающем списке). */
export function tzCity(iana: string): string {
  return TIMEZONES.find((t) => t.iana === iana)?.city || iana;
}

/** Подпись таймзоны для списков: "Москва (GMT+3)". */
export function tzOptionLabel(iana: string, date: Date = new Date()): string {
  return `${tzCity(iana)} (${gmtLabelForZone(iana, date)})`;
}

/**
 * Тикающее «сейчас», чтобы текущее время в городах обновлялось само.
 * По умолчанию раз в 30 секунд — для минут этого достаточно.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
