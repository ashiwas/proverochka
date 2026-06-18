import { Router } from 'express';
import { z } from 'zod';
import { LeadHistoryAction } from '@prisma/client';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/roles';
import { recordHistory } from '../../services/history.service';
import { assertLeadAccess } from '../../services/access';

const createSchema = z.object({ text: z.string().min(1, 'Комментарий пуст') });

// Mounted at /leads/:id/comments
export const leadCommentsRouter = Router({ mergeParams: true });
leadCommentsRouter.use(authenticate);

leadCommentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null } });
    assertLeadAccess(req.user!, lead);
    const comments = await prisma.comment.findMany({
      where: { leadId: req.params.id },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(comments);
  }),
);

leadCommentsRouter.post(
  '/',
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null } });
    assertLeadAccess(req.user!, lead);
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { text: req.body.text, leadId: req.params.id, authorId: req.user!.id },
        include: { author: { select: { id: true, name: true } } },
      });
      await recordHistory(tx, { leadId: req.params.id, userId: req.user!.id, action: LeadHistoryAction.COMMENT_ADDED });
      return c;
    });
    res.status(201).json(comment);
  }),
);

// Mounted at /comments
export const commentsRouter = Router();
commentsRouter.use(authenticate);

// Only admin can delete comments.
commentsRouter.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) throw ApiError.notFound('Комментарий не найден');
    await prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: req.params.id } });
      await recordHistory(tx, { leadId: comment.leadId, userId: req.user!.id, action: LeadHistoryAction.COMMENT_DELETED });
    });
    res.json({ ok: true });
  }),
);
