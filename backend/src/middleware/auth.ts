import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/errors';
import { prisma } from '../prisma';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  login: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Отсутствует токен');
    }
    const token = header.slice('Bearer '.length);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw ApiError.unauthorized('Пользователь не найден');
    if (user.isBlocked) throw ApiError.forbidden('Пользователь заблокирован');

    req.user = { id: user.id, role: user.role, name: user.name, login: user.login };
    next();
  } catch (e) {
    if (e instanceof ApiError) return next(e);
    next(ApiError.unauthorized('Недействительный токен'));
  }
}
