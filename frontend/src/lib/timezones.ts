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

// Крупные города → таймзона (IANA). В России нет перехода на летнее время, поэтому
// города сгруппированы по текущему смещению на представительную зону того же GMT —
// время и фильтр по таймзоне при этом остаются корректными.
export const CITY_TO_TZ: Record<string, string> = {
  // GMT+2
  'калининград': 'Europe/Kaliningrad',
  // GMT+3 (Москва и европейская часть)
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
  'рязань': 'Europe/Moscow',
  'липецк': 'Europe/Moscow',
  'пенза': 'Europe/Moscow',
  'киров': 'Europe/Moscow',
  'чебоксары': 'Europe/Moscow',
  'калуга': 'Europe/Moscow',
  'брянск': 'Europe/Moscow',
  'курск': 'Europe/Moscow',
  'иваново': 'Europe/Moscow',
  'тверь': 'Europe/Moscow',
  'белгород': 'Europe/Moscow',
  'владимир': 'Europe/Moscow',
  'архангельск': 'Europe/Moscow',
  'мурманск': 'Europe/Moscow',
  'ставрополь': 'Europe/Moscow',
  'махачкала': 'Europe/Moscow',
  'грозный': 'Europe/Moscow',
  'владикавказ': 'Europe/Moscow',
  'нальчик': 'Europe/Moscow',
  'саранск': 'Europe/Moscow',
  'вологда': 'Europe/Moscow',
  'кострома': 'Europe/Moscow',
  'орёл': 'Europe/Moscow',
  'орел': 'Europe/Moscow',
  'тамбов': 'Europe/Moscow',
  'смоленск': 'Europe/Moscow',
  'псков': 'Europe/Moscow',
  'великий новгород': 'Europe/Moscow',
  'петрозаводск': 'Europe/Moscow',
  'сыктывкар': 'Europe/Moscow',
  'симферополь': 'Europe/Moscow',
  'севастополь': 'Europe/Moscow',
  'сургут': 'Europe/Moscow',
  'нижневартовск': 'Europe/Moscow',
  'балашиха': 'Europe/Moscow',
  'подольск': 'Europe/Moscow',
  'химки': 'Europe/Moscow',
  // GMT+4
  'самара': 'Europe/Samara',
  'ижевск': 'Europe/Samara',
  'тольятти': 'Europe/Samara',
  'саратов': 'Europe/Samara',
  'энгельс': 'Europe/Samara',
  'ульяновск': 'Europe/Samara',
  'астрахань': 'Europe/Samara',
  // GMT+5
  'екатеринбург': 'Asia/Yekaterinburg',
  'челябинск': 'Asia/Yekaterinburg',
  'уфа': 'Asia/Yekaterinburg',
  'пермь': 'Asia/Yekaterinburg',
  'тюмень': 'Asia/Yekaterinburg',
  'оренбург': 'Asia/Yekaterinburg',
  'магнитогорск': 'Asia/Yekaterinburg',
  'курган': 'Asia/Yekaterinburg',
  // GMT+6
  'омск': 'Asia/Omsk',
  // GMT+7
  'новосибирск': 'Asia/Novosibirsk',
  'барнаул': 'Asia/Novosibirsk',
  'томск': 'Asia/Novosibirsk',
  'кемерово': 'Asia/Novosibirsk',
  'новокузнецк': 'Asia/Novosibirsk',
  'красноярск': 'Asia/Krasnoyarsk',
  'абакан': 'Asia/Krasnoyarsk',
  'норильск': 'Asia/Krasnoyarsk',
  // GMT+8
  'иркутск': 'Asia/Irkutsk',
  'улан-удэ': 'Asia/Irkutsk',
  'братск': 'Asia/Irkutsk',
  // GMT+9
  'якутск': 'Asia/Yakutsk',
  'чита': 'Asia/Yakutsk',
  'благовещенск': 'Asia/Yakutsk',
  // GMT+10
  'владивосток': 'Asia/Vladivostok',
  'хабаровск': 'Asia/Vladivostok',
  'комсомольск-на-амуре': 'Asia/Vladivostok',
  // GMT+11
  'магадан': 'Asia/Magadan',
  'южно-сахалинск': 'Asia/Magadan',
  // GMT+12
  'петропавловск-камчатский': 'Asia/Kamchatka',
  'анадырь': 'Asia/Kamchatka',
  // Ближнее зарубежье
  'минск': 'Europe/Minsk',
  'киев': 'Europe/Kyiv',
  'алматы': 'Asia/Almaty',
  'нур-султан': 'Asia/Almaty',
  'астана': 'Asia/Almaty',
  'ташкент': 'Asia/Tashkent',
  'тбилиси': 'Asia/Tbilisi',
  'ереван': 'Asia/Yerevan',
  'баку': 'Asia/Baku',
};

/** Города с заглавной для подсказок (отсортированы). */
export const CITY_SUGGESTIONS = Object.keys(CITY_TO_TZ)
  .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
  .sort((a, b) => a.localeCompare(b, 'ru'));

/** Подобрать таймзону по названию города (или '' если не нашли). */
export function guessTimezone(city: string): string {
  if (!city) return '';
  return CITY_TO_TZ[city.trim().toLowerCase()] || '';
}

/** Поиск городов по началу/вхождению строки — для автокомплита. */
export function searchCities(query: string, limit = 8): { city: string; tz: string }[] {
  const q = query.trim().toLowerCase();
  const entries = Object.entries(CITY_TO_TZ).map(([k, tz]) => ({
    city: k.charAt(0).toUpperCase() + k.slice(1),
    tz,
    key: k,
  }));
  const matches = q
    ? entries
        .filter((e) => e.key.includes(q))
        // сначала те, что начинаются с запроса
        .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) || a.key.localeCompare(b.key, 'ru'))
    : entries.sort((a, b) => a.key.localeCompare(b.key, 'ru'));
  return matches.slice(0, limit).map(({ city, tz }) => ({ city, tz }));
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
