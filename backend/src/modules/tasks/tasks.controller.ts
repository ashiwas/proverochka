import { Router } from 'express';
import { Prisma, LeadHistoryAction, TaskStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { isAdmin } from '../../middleware/roles';
import { recordHistory } from '../../services/history.service';
import { assertLeadAccess } from '../../services/access';
import { withDerivedStatus } from '../../services/taskStatus';
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from './tasks.schemas';

export const tasksRouter = Router();
tasksRouter.use(authenticate);

const include = {
  lead: { select: { id: true, companyName: true, status: true } },
  assignee: { select: { id: true, name: true } },
} as const;

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

tasksRouter.get(
  '/',
  validate({ query: taskQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as any;
    const now = new Date();
    const where: Prisma.TaskWhereInput = {};

    if (!isAdmin(req)) where.assigneeId = req.user!.id;
    else if (q.managerId) where.assigneeId = q.managerId;
    if (q.leadId) where.leadId = q.leadId;

    if (q.scope === 'done') where.status = TaskStatus.DONE;
    else if (q.scope === 'active') { where.status = TaskStatus.ACTIVE; where.dueAt = { gte: now }; }
    else if (q.scope === 'overdue') { where.status = TaskStatus.ACTIVE; where.dueAt = { lt: now }; }
    else if (q.scope === 'pending') { where.status = TaskStatus.ACTIVE; }
    else if (q.scope === 'today') { where.dueAt = { gte: startOfDay(now), lte: endOfDay(now) }; }

    if (q.date) where.dueAt = { gte: startOfDay(q.date), lte: endOfDay(q.date) };

    const tasks = await prisma.task.findMany({ where, include, orderBy: { dueAt: 'asc' } });
    res.json(tasks.map((t) => withDerivedStatus(t, now)));
  }),
);

tasksRouter.post(
  '/',
  validate({ body: createTaskSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body;
    const lead = await prisma.lead.findUnique({ where: { id: body.leadId } });
    assertLeadAccess(req.user!, lead);

    let assigneeId = lead!.assigneeId;
    if (isAdmin(req) && body.assigneeId) assigneeId = body.assigneeId;
    else if (!isAdmin(req)) assigneeId = req.user!.id;

    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: { leadId: body.leadId, type: body.type, text: body.text, dueAt: body.dueAt, assigneeId },
        include,
      });
      await recordHistory(tx, {
        leadId: body.leadId, userId: req.user!.id, action: LeadHistoryAction.TASK_CREATED,
        details: { type: created.type, text: created.text },
      });
      return created;
    });
    res.status(201).json(withDerivedStatus(task));
  }),
);

tasksRouter.patch(
  '/:id',
  validate({ body: updateTaskSchema }),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { lead: true } });
    if (!task) throw ApiError.notFound('Задача не найдена');
    assertLeadAccess(req.user!, task.lead);

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.task.update({ where: { id: req.params.id }, data: req.body, include });
      await recordHistory(tx, {
        leadId: task.leadId, userId: req.user!.id, action: LeadHistoryAction.TASK_UPDATED,
        details: { changedFields: Object.keys(req.body) },
      });
      return u;
    });
    res.json(withDerivedStatus(updated));
  }),
);

tasksRouter.patch(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { lead: true } });
    if (!task) throw ApiError.notFound('Задача не найдена');
    assertLeadAccess(req.user!, task.lead);

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.task.update({
        where: { id: req.params.id },
        data: { status: TaskStatus.DONE, completedAt: new Date() },
        include,
      });
      await recordHistory(tx, {
        leadId: task.leadId, userId: req.user!.id, action: LeadHistoryAction.TASK_COMPLETED,
        details: { text: task.text },
      });
      return u;
    });
    res.json(withDerivedStatus(updated));
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { lead: true } });
    if (!task) throw ApiError.notFound('Задача не найдена');
    assertLeadAccess(req.user!, task.lead);

    await prisma.$transaction(async (tx) => {
      await tx.task.delete({ where: { id: req.params.id } });
      await recordHistory(tx, {
        leadId: task.leadId, userId: req.user!.id, action: LeadHistoryAction.TASK_DELETED,
        details: { text: task.text },
      });
    });
    res.json({ ok: true });
  }),
);
