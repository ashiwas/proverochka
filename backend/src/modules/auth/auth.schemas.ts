import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Укажите логин'),
  password: z.string().min(1, 'Укажите пароль'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Отсутствует refresh-токен'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Укажите текущий пароль'),
  newPassword: z.string().min(6, 'Минимум 6 символов'),
});
