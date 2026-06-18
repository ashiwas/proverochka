import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  login: z.string().min(3),
  password: z.string().min(6, 'Минимум 6 символов'),
  role: z.enum(['ADMIN', 'MANAGER']).default('MANAGER'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  login: z.string().min(3).optional(),
  role: z.enum(['ADMIN', 'MANAGER']).optional(),
});

export const blockUserSchema = z.object({ isBlocked: z.boolean() });
export const passwordSchema = z.object({ password: z.string().min(6) });
