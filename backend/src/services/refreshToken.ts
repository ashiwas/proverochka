import crypto from 'crypto';
import { prisma } from '../prisma';
import { env } from '../config/env';

/** Случайный refresh-токен (отдаётся клиенту) + его sha256-хэш (хранится в БД). */
function generate(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(48).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/** Выпустить новый refresh-токен для пользователя. Возвращает «сырой» токен для клиента. */
export async function issueRefreshToken(userId: string): Promise<string> {
  const { raw, hash } = generate();
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { tokenHash: hash, userId, expiresAt } });
  return raw;
}

/**
 * Проверить refresh-токен и провести ротацию: старый отзывается, выпускается новый.
 * Возвращает userId и новый «сырой» токен, либо null если токен недействителен.
 */
export async function rotateRefreshToken(raw: string): Promise<{ userId: string; refreshToken: string } | null> {
  const hash = hashToken(raw);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
  if (!existing || existing.revokedAt || existing.expiresAt.getTime() < Date.now()) return null;

  const { raw: newRaw, hash: newHash } = generate();
  const expiresAt = new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } }),
    prisma.refreshToken.create({ data: { tokenHash: newHash, userId: existing.userId, expiresAt } }),
  ]);
  return { userId: existing.userId, refreshToken: newRaw };
}

/** Отозвать конкретный refresh-токен (logout). Молча игнорирует неизвестные токены. */
export async function revokeRefreshToken(raw: string): Promise<void> {
  const hash = hashToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
