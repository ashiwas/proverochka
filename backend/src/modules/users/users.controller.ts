import { Router } from 'express';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { hashPassword } from '../../utils/password';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/roles';
import { createUserSchema, updateUserSchema, blockUserSchema, passwordSchema } from './users.schemas';

export const usersRouter = Router();
usersRouter.use(authenticate, requireAdmin);

const publicSelect = {
  id: true, name: true, login: true, role: true, isBlocked: true, createdAt: true, updatedAt: true,
  _count: { select: { leads: true, tasks: true } },
} as const;

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select: publicSelect, orderBy: { createdAt: 'asc' } });
    res.json(users);
  }),
);

usersRouter.post(
  '/',
  validate({ body: createUserSchema }),
  asyncHandler(async (req, res) => {
    const { name, login, password, role } = req.body;
    const exists = await prisma.user.findUnique({ where: { login } });
    if (exists) throw ApiError.conflict('Логин уже занят');
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, login, passwordHash, role },
      select: publicSelect,
    });
    res.status(201).json(user);
  }),
);

usersRouter.patch(
  '/:id',
  validate({ body: updateUserSchema }),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
      select: publicSelect,
    });
    res.json(user);
  }),
);

usersRouter.patch(
  '/:id/block',
  validate({ body: blockUserSchema }),
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw ApiError.badRequest('Нельзя заблокировать самого себя');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isBlocked: req.body.isBlocked },
      select: publicSelect,
    });
    res.json(user);
  }),
);

usersRouter.patch(
  '/:id/password',
  validate({ body: passwordSchema }),
  asyncHandler(async (req, res) => {
    const passwordHash = await hashPassword(req.body.password);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    res.json({ ok: true });
  }),
);
