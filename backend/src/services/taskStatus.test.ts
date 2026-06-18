import { describe, it, expect } from 'vitest';
import { TaskStatus } from '@prisma/client';
import { deriveTaskStatus, withDerivedStatus } from './taskStatus';

const now = new Date('2026-06-18T12:00:00Z');
const past = new Date('2026-06-17T12:00:00Z');
const future = new Date('2026-06-19T12:00:00Z');

describe('deriveTaskStatus', () => {
  it('DONE остаётся DONE даже если срок прошёл', () => {
    expect(deriveTaskStatus({ status: TaskStatus.DONE, dueAt: past }, now)).toBe('DONE');
  });

  it('активная с прошедшим сроком — OVERDUE', () => {
    expect(deriveTaskStatus({ status: TaskStatus.ACTIVE, dueAt: past }, now)).toBe('OVERDUE');
  });

  it('активная с будущим сроком — ACTIVE', () => {
    expect(deriveTaskStatus({ status: TaskStatus.ACTIVE, dueAt: future }, now)).toBe('ACTIVE');
  });
});

describe('withDerivedStatus', () => {
  it('добавляет derivedStatus и isOverdue', () => {
    const res = withDerivedStatus({ status: TaskStatus.ACTIVE, dueAt: past }, now);
    expect(res.derivedStatus).toBe('OVERDUE');
    expect(res.isOverdue).toBe(true);
  });
});
