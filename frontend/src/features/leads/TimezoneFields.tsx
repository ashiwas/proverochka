import { useRef, useState } from 'react';
import { Field, Input, Select } from '../../components/ui';
import {
  TIMEZONES, searchCities, guessTimezone, tzOptionLabel,
  currentTimeInZone, gmtLabelForZone, useNow,
} from '../../lib/timezones';

/**
 * Автокомплит города: при вводе показывает подходящие города; при выборе
 * подставляет город и его таймзону. Допускает и произвольный город (тогда зону
 * можно выбрать вручную в соседнем поле).
 */
function CityCombobox({
  value, onCity, onTimezone,
}: {
  value: string;
  onCity: (v: string) => void;
  onTimezone: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matches = searchCities(value);

  const choose = (city: string, tz: string) => {
    onCity(city);
    if (tz) onTimezone(tz);
    setOpen(false);
  };

  const onChange = (v: string) => {
    onCity(v);
    setOpen(true);
    setHi(0);
    // Если ввели ровно известный город — сразу подставим зону.
    const guess = guessTimezone(v);
    if (guess) onTimezone(guess);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(matches.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter' && open && matches[hi]) { e.preventDefault(); choose(matches[hi].city, matches[hi].tz); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder="Начните вводить, напр. Ижевск"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
        onKeyDown={onKey}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg">
          {matches.map((m, i) => (
            <li
              key={m.city}
              onMouseDown={(e) => { e.preventDefault(); if (blurTimer.current) clearTimeout(blurTimer.current); choose(m.city, m.tz); }}
              onMouseEnter={() => setHi(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm ${
                i === hi ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-elevated'}`}
            >
              <span>{m.city}</span>
              <span className="text-xs text-ink-faint">{gmtLabelForZone(m.tz)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Пара полей «Город» + «Таймзона» с автокомплитом города, автоподстановкой зоны
 * и живым показом текущего времени. Используется в форме создания и в карточке лида.
 */
export function TimezoneFields({
  city, timezone, onCity, onTimezone, className,
}: {
  city: string;
  timezone: string;
  onCity: (v: string) => void;
  onTimezone: (v: string) => void;
  className?: string;
}) {
  const now = useNow();
  const knownIanas = TIMEZONES.map((t) => t.iana);
  const extraZone = timezone && !knownIanas.includes(timezone) ? timezone : null;

  return (
    <>
      <Field label="Город" className={className}>
        <CityCombobox value={city} onCity={onCity} onTimezone={onTimezone} />
      </Field>
      <Field label="Таймзона" className={className}>
        <Select value={timezone} onChange={(e) => onTimezone(e.target.value)}>
          <option value="">— Не указана —</option>
          {TIMEZONES.map((t) => (
            <option key={t.iana} value={t.iana}>{tzOptionLabel(t.iana, now)}</option>
          ))}
          {extraZone && <option value={extraZone}>{extraZone}</option>}
        </Select>
        {timezone && (
          <div className="mt-1 text-xs text-ink-faint">
            Сейчас там: <span className="font-medium text-ink-soft">{currentTimeInZone(timezone, now)}</span>{' '}
            · {gmtLabelForZone(timezone, now)}
          </div>
        )}
      </Field>
    </>
  );
}
