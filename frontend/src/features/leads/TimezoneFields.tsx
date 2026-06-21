import { Field, Input, Select } from '../../components/ui';
import {
  TIMEZONES, CITY_SUGGESTIONS, guessTimezone, tzOptionLabel,
  currentTimeInZone, gmtLabelForZone, useNow,
} from '../../lib/timezones';

/**
 * Пара полей «Город» + «Таймзона» с автоподбором зоны по городу и живым
 * показом текущего времени. Используется в форме создания и в карточке лида.
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

  const changeCity = (v: string) => {
    onCity(v);
    // Если по городу однозначно угадывается зона — подставляем её.
    const guess = guessTimezone(v);
    if (guess) onTimezone(guess);
  };

  // Если у лида сохранена зона не из базового списка — всё равно покажем её опцией.
  const knownIanas = TIMEZONES.map((t) => t.iana);
  const extraZone = timezone && !knownIanas.includes(timezone) ? timezone : null;

  return (
    <>
      <Field label="Город" className={className}>
        <Input
          list="city-suggestions"
          placeholder="Например, Москва"
          value={city}
          onChange={(e) => changeCity(e.target.value)}
        />
        <datalist id="city-suggestions">
          {CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
        </datalist>
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
