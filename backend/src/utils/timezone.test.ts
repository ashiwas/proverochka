import { describe, it, expect } from 'vitest';
import { isValidTimeZone, gmtOffsetMinutes, gmtLabel } from './timezone';

describe('isValidTimeZone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimeZone('Europe/Moscow')).toBe(true);
    expect(isValidTimeZone('Asia/Vladivostok')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
  });
  it('rejects nonsense', () => {
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone('GMT+3')).toBe(false);
  });
});

describe('gmtOffsetMinutes', () => {
  it('computes fixed offsets (Russia has no DST)', () => {
    expect(gmtOffsetMinutes('Europe/Moscow')).toBe(180);
    expect(gmtOffsetMinutes('Asia/Vladivostok')).toBe(600);
    expect(gmtOffsetMinutes('UTC')).toBe(0);
  });
  it('handles half-hour zones', () => {
    // India is UTC+5:30 year-round.
    expect(gmtOffsetMinutes('Asia/Kolkata')).toBe(330);
  });
});

describe('gmtLabel', () => {
  it('formats whole-hour offsets', () => {
    expect(gmtLabel(180)).toBe('GMT+3');
    expect(gmtLabel(0)).toBe('GMT+0');
    expect(gmtLabel(-300)).toBe('GMT-5');
  });
  it('formats fractional offsets', () => {
    expect(gmtLabel(330)).toBe('GMT+5:30');
  });
});
