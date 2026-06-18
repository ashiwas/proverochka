import { Role } from '@prisma/client';
import { ApiError } from '../utils/errors';
import { AuthUser } from '../middleware/auth';

/** Throws 403/404 if a manager tries to touch a lead they don't own. */
export function assertLeadAccess(user: AuthUser, lead: { assigneeId: string } | null) {
  if (!lead) throw ApiError.notFound('Лид не найден');
  if (user.role === Role.ADMIN) return;
  if (lead.assigneeId !== user.id) throw ApiError.forbidden('Это не ваш лид');
}
