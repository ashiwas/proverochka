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

// Базовый набор зон для фильтра и выпадающего списка: все таймзоны России +
// ближайшее зарубежье. Города ниже сгруппированы по этим же зонам.
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

// Города по зонам (с правильными названиями для подсказок). В России нет перехода
// на летнее время, поэтому города сгруппированы по текущему смещению на
// представительную IANA-зону того же GMT — время и фильтр остаются корректными.
const ZONE_CITIES: Record<string, string[]> = {
  'Europe/Kaliningrad': [
    'Калининград', 'Советск', 'Черняховск', 'Балтийск', 'Гусев', 'Светлогорск', 'Зеленоградск', 'Гвардейск',
  ],
  'Europe/Moscow': [
    'Москва', 'Санкт-Петербург', 'Нижний Новгород', 'Казань', 'Воронеж', 'Ростов-на-Дону', 'Краснодар',
    'Ярославль', 'Рязань', 'Липецк', 'Тула', 'Брянск', 'Иваново', 'Тверь', 'Курск', 'Владимир', 'Калуга',
    'Смоленск', 'Орёл', 'Тамбов', 'Кострома', 'Белгород', 'Пенза', 'Киров', 'Чебоксары', 'Саранск',
    'Йошкар-Ола', 'Вологда', 'Череповец', 'Архангельск', 'Северодвинск', 'Мурманск', 'Великий Новгород',
    'Псков', 'Петрозаводск', 'Сыктывкар', 'Ухта', 'Воркута', 'Махачкала', 'Грозный', 'Владикавказ',
    'Нальчик', 'Черкесск', 'Майкоп', 'Назрань', 'Каспийск', 'Дербент', 'Хасавюрт', 'Ставрополь',
    'Пятигорск', 'Кисловодск', 'Ессентуки', 'Невинномысск', 'Минеральные Воды', 'Георгиевск', 'Сочи',
    'Новороссийск', 'Анапа', 'Геленджик', 'Армавир', 'Туапсе', 'Таганрог', 'Шахты', 'Новочеркасск',
    'Волгодонск', 'Батайск', 'Азов', 'Волгоград', 'Волжский', 'Камышин', 'Симферополь', 'Севастополь',
    'Керчь', 'Евпатория', 'Ялта', 'Феодосия', 'Балашиха', 'Подольск', 'Химки', 'Королёв', 'Мытищи',
    'Люберцы', 'Красногорск', 'Электросталь', 'Коломна', 'Одинцово', 'Домодедово', 'Серпухов', 'Щёлково',
    'Орехово-Зуево', 'Раменское', 'Долгопрудный', 'Жуковский', 'Пушкино', 'Ногинск', 'Сергиев Посад',
    'Реутов', 'Видное', 'Клин', 'Дмитров', 'Чехов', 'Дубна', 'Наро-Фоминск', 'Обнинск', 'Дзержинск',
    'Арзамас', 'Саров', 'Старый Оскол', 'Губкин', 'Рыбинск', 'Ковров', 'Муром', 'Новомосковск', 'Елец',
    'Мичуринск', 'Кинешма', 'Великие Луки', 'Гатчина', 'Выборг', 'Всеволожск', 'Сосновый Бор', 'Тихвин',
    'Кириши', 'Колпино', 'Пушкин',
  ],
  'Europe/Samara': [
    'Самара', 'Тольятти', 'Сызрань', 'Новокуйбышевск', 'Чапаевск', 'Отрадный', 'Ижевск', 'Сарапул',
    'Воткинск', 'Глазов', 'Саратов', 'Энгельс', 'Балаково', 'Балашов', 'Ульяновск', 'Димитровград',
    'Астрахань', 'Ахтубинск',
  ],
  'Asia/Yekaterinburg': [
    'Екатеринбург', 'Нижний Тагил', 'Каменск-Уральский', 'Первоуральск', 'Серов', 'Новоуральск', 'Асбест',
    'Верхняя Пышма', 'Ревда', 'Полевской', 'Челябинск', 'Магнитогорск', 'Златоуст', 'Миасс', 'Копейск',
    'Озёрск', 'Троицк', 'Снежинск', 'Уфа', 'Стерлитамак', 'Салават', 'Нефтекамск', 'Октябрьский',
    'Белорецк', 'Ишимбай', 'Кумертау', 'Туймазы', 'Пермь', 'Березники', 'Соликамск', 'Чайковский',
    'Лысьва', 'Кунгур', 'Оренбург', 'Орск', 'Новотроицк', 'Бузулук', 'Тюмень', 'Тобольск', 'Ишим',
    'Курган', 'Шадринск', 'Сургут', 'Нижневартовск', 'Нефтеюганск', 'Ханты-Мансийск', 'Когалым', 'Нягань',
    'Новый Уренгой', 'Ноябрьск', 'Салехард', 'Надым',
  ],
  'Asia/Omsk': ['Омск', 'Тара', 'Исилькуль', 'Калачинск'],
  'Asia/Novosibirsk': [
    'Новосибирск', 'Бердск', 'Искитим', 'Барнаул', 'Бийск', 'Рубцовск', 'Новоалтайск', 'Томск', 'Северск',
    'Кемерово', 'Новокузнецк', 'Прокопьевск', 'Ленинск-Кузнецкий', 'Киселёвск', 'Междуреченск', 'Юрга',
    'Белово', 'Анжеро-Судженск',
  ],
  'Asia/Krasnoyarsk': [
    'Красноярск', 'Норильск', 'Ачинск', 'Канск', 'Минусинск', 'Железногорск', 'Лесосибирск', 'Абакан',
    'Черногорск', 'Саяногорск', 'Кызыл',
  ],
  'Asia/Irkutsk': [
    'Иркутск', 'Братск', 'Ангарск', 'Усть-Илимск', 'Усолье-Сибирское', 'Черемхово', 'Шелехов', 'Улан-Удэ',
    'Северобайкальск',
  ],
  'Asia/Yakutsk': [
    'Якутск', 'Нерюнгри', 'Мирный', 'Ленск', 'Чита', 'Краснокаменск', 'Борзя', 'Благовещенск', 'Белогорск',
    'Свободный', 'Тында',
  ],
  'Asia/Vladivostok': [
    'Владивосток', 'Уссурийск', 'Находка', 'Артём', 'Арсеньев', 'Спасск-Дальний', 'Хабаровск',
    'Комсомольск-на-Амуре', 'Амурск', 'Биробиджан',
  ],
  'Asia/Magadan': ['Магадан', 'Южно-Сахалинск', 'Корсаков', 'Холмск'],
  'Asia/Kamchatka': ['Петропавловск-Камчатский', 'Елизово', 'Анадырь'],
  'Europe/Minsk': ['Минск', 'Гомель', 'Могилёв', 'Витебск', 'Гродно', 'Брест'],
  'Europe/Kyiv': ['Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов'],
  'Asia/Almaty': ['Алматы', 'Астана', 'Шымкент', 'Караганда'],
  'Asia/Tashkent': ['Ташкент', 'Самарканд', 'Бухара'],
  'Asia/Tbilisi': ['Тбилиси', 'Батуми'],
  'Asia/Yerevan': ['Ереван', 'Гюмри'],
  'Asia/Baku': ['Баку', 'Гянджа'],
};

// Производные структуры из ZONE_CITIES.
interface CityEntry { city: string; lc: string; tz: string }
const CITY_LIST: CityEntry[] = Object.entries(ZONE_CITIES)
  .flatMap(([tz, cities]) => cities.map((city) => ({ city, lc: city.toLowerCase(), tz })))
  .sort((a, b) => a.city.localeCompare(b.city, 'ru'));

/** Город (в нижнем регистре) → таймзона. */
export const CITY_TO_TZ: Record<string, string> = Object.fromEntries(CITY_LIST.map((e) => [e.lc, e.tz]));
// Популярные сокращения — для автоподстановки зоны при точном вводе.
Object.assign(CITY_TO_TZ, {
  'спб': 'Europe/Moscow',
  'питер': 'Europe/Moscow',
  'мск': 'Europe/Moscow',
  'нижний': 'Europe/Moscow',
  'екб': 'Asia/Yekaterinburg',
  'нск': 'Asia/Novosibirsk',
  'нур-султан': 'Asia/Almaty',
});

/** Все названия городов для подсказок (отсортированы). */
export const CITY_SUGGESTIONS = CITY_LIST.map((e) => e.city);

/** Подобрать таймзону по названию города (или '' если не нашли). */
export function guessTimezone(city: string): string {
  if (!city) return '';
  return CITY_TO_TZ[city.trim().toLowerCase()] || '';
}

/** Поиск городов по началу/вхождению строки — для автокомплита. */
export function searchCities(query: string, limit = 10): { city: string; tz: string }[] {
  const q = query.trim().toLowerCase();
  const list = q ? CITY_LIST.filter((e) => e.lc.includes(q)) : CITY_LIST;
  const sorted = q
    ? [...list].sort(
        (a, b) => Number(b.lc.startsWith(q)) - Number(a.lc.startsWith(q)) || a.city.localeCompare(b.city, 'ru'),
      )
    : list;
  return sorted.slice(0, limit).map(({ city, tz }) => ({ city, tz }));
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
