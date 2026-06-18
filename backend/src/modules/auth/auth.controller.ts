import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { verifyPassword, hashPassword } from '../../utils/password';
import { signToken } from '../../utils/jwt';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../../services/refreshToken';
import { loginSchema, refreshSchema, changePasswordSchema } from './auth.schemas';

export const authRouter = Router();

// Защита от перебора паролей: не больше 10 попыток за 15 минут с одного IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
});

authRouter.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { login, password } = req.body as { login: string; password: string };
    const user = await prisma.user.findUnique({ where: { login } });
    if (!user) throw ApiError.unauthorized('Неверный логин или пароль');
    if (user.isBlocked) throw ApiError.forbidden('Пользователь заблокирован');

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Неверный логин или пароль');

    const token = signToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id);
    res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, login: user.login, role: user.role },
    });
  }),
);

// Обновление access-токена по refresh-токену (с ротацией refresh-токена).
authRouter.post(
  '/refresh',
  loginLimiter,
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const rotated = await rotateRefreshToken(req.body.refreshToken);
    if (!rotated) throw ApiError.unauthorized('Недействительный refresh-токен');

    const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || user.isBlocked) throw ApiError.unauthorized('Сессия недействительна');

    const token = signToken({ sub: user.id, role: user.role });
    res.json({
      token,
      refreshToken: rotated.refreshToken,
      user: { id: user.id, name: user.name, login: user.login, role: user.role },
    });
  }),
);

// Выход: отзыв refresh-токена.
authRouter.post(
  '/logout',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    await revokeRefreshToken(req.body.refreshToken);
    res.json({ ok: true });
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

// Самостоятельная смена пароля (доступна любому вошедшему пользователю).
authRouter.patch(
  '/password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.unauthorized();

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw ApiError.badRequest('Текущий пароль неверен');

    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Все прежние сессии (refresh-токены) после смены пароля становятся недействительны.
      prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    res.json({ ok: true });
  }),
);
