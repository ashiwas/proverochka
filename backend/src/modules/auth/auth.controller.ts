import { Router } from 'express';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { verifyPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { loginSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { login, password } = req.body as { login: string; password: string };
    const user = await prisma.user.findUnique({ where: { login } });
    if (!user) throw ApiError.unauthorized('Неверный логин или пароль');
    if (user.isBlocked) throw ApiError.forbidden('Пользователь заблокирован');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Неверный логин или пароль');

    const token = signToken({ sub: user.id, role: user.role });
    res.json({
      token,
      user: { id: user.id, name: user.name, login: user.login, role: user.role },
    });
  }),
);

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, login: true, role: true, isBlocked: true, createdAt: true },
    });
    res.json(user);
  }),
);
