import { describe, it, expect } from 'vitest';
import { normalizeExtraPhones, onlyDigits, computePhoneSearch, leadMatchesPhone } from './leads.utils';

describe('normalizeExtraPhones', () => {
  it('возвращает [] для не-массива', () => {
    expect(normalizeExtraPhones(undefined)).toEqual([]);
    expect(normalizeExtraPhones(null)).toEqual([]);
    expect(normalizeExtraPhones('строка')).toEqual([]);
  });

  it('выкидывает пустые номера и тримит значения', () => {
    expect(
      normalizeExtraPhones([
        { name: ' Бухгалтерия ', phone: ' +7 900 ' },
        { name: 'Пусто', phone: '   ' },
      ]),
    ).toEqual([{ name: 'Бухгалтерия', phone: '+7 900' }]);
  });

  it('поддерживает старый формат — массив строк', () => {
    expect(normalizeExtraPhones(['+7 911', ''])).toEqual([{ name: '', phone: '+7 911' }]);
  });
});

describe('onlyDigits', () => {
  it('оставляет только цифры', () => {
    expect(onlyDigits('+7 (900) 123-45-67')).toBe('79001234567');
  });
});

describe('computePhoneSearch', () => {
  it('склеивает цифры основного и доп. телефонов через пробел', () => {
    const res = computePhoneSearch('+7 900 111-11-11', [{ name: 'Бух', phone: '8 (495) 000-00-00' }]);
    expect(res).toBe('79001111111 84950000000');
  });

  it('пропускает пустые номера', () => {
    expect(computePhoneSearch('123', [])).toBe('123');
  });
});

describe('leadMatchesPhone', () => {
  const lead = { mainPhone: '+7 900 111-11-11', extraPhones: [{ name: '', phone: '8 495 000 00 00' }] };

  it('находит по части основного номера', () => {
    expect(leadMatchesPhone(lead, '1111')).toBe(true);
  });

  it('находит по доп. номеру с другим форматированием', () => {
    expect(leadMatchesPhone(lead, '(495) 000')).toBe(true);
  });

  it('не находит несуществующий номер', () => {
    expect(leadMatchesPhone(lead, '777')).toBe(false);
  });

  it('пустой запрос — нет совпадения', () => {
    expect(leadMatchesPhone(lead, '')).toBe(false);
  });
});
