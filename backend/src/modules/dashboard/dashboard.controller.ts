import { Router } from 'express';
import { Role, TaskStatus, LeadStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { isAdmin } from '../../middleware/roles';

export const dashboardRouter = Router();
dashboardRouter.use(authenticate);

dashboardRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const start = new Date(now); start.setHours(0,0,0,0);
    const end = new Date(now); end.setHours(23,59,59,999);

    if (isAdmin(req)) {
      const [totalLeads, byStatus, managers, overdue, leadsNoTasks] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.groupBy({ by: ['status'], _count: true }),
        prisma.user.findMany({
          where: { role: Role.MANAGER },
          select: { id: true, name: true, _count: { select: { leads: true, tasks: true } } },
        }),
        prisma.task.count({ where: { status: TaskStatus.ACTIVE, dueAt: { lt: now } } }),
        prisma.lead.count({ where: { tasks: { none: { status: TaskStatus.ACTIVE } } } }),
      ]);
      return res.json({
        role: 'ADMIN',
        totalLeads,
        leadsByStatus: normalizeStatuses(byStatus),
        overdueTasks: overdue,
        leadsWithoutTasks: leadsNoTasks,
        byManager: managers.map((m) => ({ id: m.id, name: m.name, leads: m._count.leads, tasks: m._count.tasks })),
      });
    }

    const me = req.user!.id;
    const [myLeads, byStatus, activeTasks, overdueTasks, todayTasks, leadsNoTasks] = await Promise.all([
      prisma.lead.count({ where: { assigneeId: me } }),
      prisma.lead.groupBy({ by: ['status'], where: { assigneeId: me }, _count: true }),
      prisma.task.count({ where: { assigneeId: me, status: TaskStatus.ACTIVE, dueAt: { gte: now } } }),
      prisma.task.count({ where: { assigneeId: me, status: TaskStatus.ACTIVE, dueAt: { lt: now } } }),
      prisma.task.count({ where: { assigneeId: me, dueAt: { gte: start, lte: end } } }),
      prisma.lead.count({ where: { assigneeId: me, tasks: { none: { status: TaskStatus.ACTIVE } } } }),
    ]);
    res.json({
      role: 'MANAGER',
      myLeads,
      leadsByStatus: normalizeStatuses(byStatus),
      activeTasks,
      overdueTasks,
      todayTasks,
      leadsWithoutTasks: leadsNoTasks,
    });
  }),
);

function normalizeStatuses(rows: { status: LeadStatus; _count: number }[]) {
  const all: Record<string, number> = {
    NEW: 0, DEADLINE_SHIFT: 0, GET_FEEDBACK: 0, WARM: 0, AWAITING_PAYMENT: 0, IN_PROGRESS: 0, CLOSED: 0,
  };
  for (const r of rows) all[r.status] = r._count;
  return all;
}
