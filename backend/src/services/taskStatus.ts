import { Task, TaskStatus } from '@prisma/client';

export type DerivedTaskStatus = 'ACTIVE' | 'DONE' | 'OVERDUE';

/** OVERDUE is derived, never stored. */
export function deriveTaskStatus(task: Pick<Task, 'status' | 'dueAt'>, now = new Date()): DerivedTaskStatus {
  if (task.status === TaskStatus.DONE) return 'DONE';
  return task.dueAt.getTime() < now.getTime() ? 'OVERDUE' : 'ACTIVE';
}

export function withDerivedStatus<T extends Pick<Task, 'status' | 'dueAt'>>(task: T, now = new Date()) {
  const derived = deriveTaskStatus(task, now);
  return { ...task, derivedStatus: derived, isOverdue: derived === 'OVERDUE' };
}
