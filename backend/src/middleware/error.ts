import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Маршрут не найден' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Запись с такими данными уже существует' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Запись не найдена' });
    return res.status(400).json({ error: 'Ошибка базы данных', code: err.code });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}
