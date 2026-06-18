import { z } from 'zod';

const TASK_TYPES = ['CALL','PROMISED_CALL','GET_FEEDBACK','WORK_CHECK','START_WORK','OTHER'] as const;

export const createTaskSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(TASK_TYPES).default('CALL'),
  text: z.string().min(1, 'Укажите текст задачи'),
  dueAt: z.coerce.date(),            // ISO datetime (date + time merged on the client)
  assigneeId: z.string().uuid().optional(),
});

export const updateTaskSchema = z.object({
  type: z.enum(TASK_TYPES).optional(),
  text: z.string().min(1).optional(),
  dueAt: z.coerce.date().optional(),
  assigneeId: z.string().uuid().optional(),
});

export const taskQuerySchema = z.object({
  managerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  // scope: all | today | overdue | done | active | pending
  // pending = все НЕвыполненные (активные + просроченные) — для канбана задач
  scope: z.enum(['all', 'today', 'overdue', 'done', 'active', 'pending']).optional().default('all'),
  date: z.coerce.date().optional(),
});
