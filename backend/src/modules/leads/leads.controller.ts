import { Router } from 'express';
import { Prisma, Role, LeadHistoryAction, TaskStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { requireAdmin, isAdmin } from '../../middleware/roles';
import { recordHistory } from '../../services/history.service';
import { assertLeadAccess } from '../../services/access';
import { withDerivedStatus } from '../../services/taskStatus';
import {
  createLeadSchema, updateLeadSchema, statusSchema, assignSchema,
  leadQuerySchema, lookupQuerySchema, importLeadsSchema,
} from './leads.schemas';

export const leadsRouter = Router();
leadsRouter.use(authenticate);

const assigneeSelect = { id: true, name: true, login: true } as const;

type ExtraPhone = { name: string; phone: string };

/** Привести доп. телефоны к виду [{name, phone}], выкинуть пустые. */
function normalizeExtraPhones(value: unknown): ExtraPhone[] {
  if (!Array.isArray(value)) return [];
  const out: ExtraPhone[] = [];
  for (const item of value) {
    if (item && typeof item === 'object' && 'phone' in (item as any)) {
      const phone = String((item as any).phone || '').trim();
      if (phone) out.push({ name: String((item as any).name || '').trim(), phone });
    } else if (typeof item === 'string' && item.trim()) {
      // на случай старых данных в виде простого массива строк
      out.push({ name: '', phone: item.trim() });
    }
  }
  return out;
}

const onlyDigits = (s: string) => s.replace(/\D/g, '');

/** Совпадает ли искомый номер с любым телефоном лида (main + extra). */
function leadMatchesPhone(lead: { mainPhone: string; extraPhones: unknown }, raw: string): boolean {
  const q = onlyDigits(raw);
  if (!q) return false;
  const phones = [lead.mainPhone, ...normalizeExtraPhones(lead.extraPhones).map((p) => p.phone)];
  return phones.some((p) => onlyDigits(p).includes(q));
}

/** Build the "card" projection: nextTask + hasOverdueTasks + counts. */
function decorateLead(lead: any, now = new Date()) {
  const activeTasks = (lead.tasks || []).filter((t: any) => t.status === TaskStatus.ACTIVE);
  const overdue = activeTasks.filter((t: any) => t.dueAt.getTime() < now.getTime());
  const upcoming = [...activeTasks].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  const { tasks, _count, ...rest } = lead;
  return {
    ...rest,
    extraPhones: normalizeExtraPhones(rest.extraPhones),
    nextTask: upcoming[0] ? withDerivedStatus(upcoming[0], now) : null,
    hasOverdueTasks: overdue.length > 0,
    activeTaskCount: activeTasks.length,
    overdueTaskCount: overdue.length,
  };
}

leadsRouter.get(
  '/',
  validate({ query: leadQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as any;
    const where: Prisma.LeadWhereInput = {};

    // Managers are locked to their own leads.
    if (!isAdmin(req)) where.assigneeId = req.user!.id;
    else if (q.managerId) where.assigneeId = q.managerId;

    if (q.status) where.status = q.status;
    if (q.company) where.companyName = { contains: q.company, mode: 'insensitive' };

    const leads = await prisma.lead.findMany({
      where,
      include: { assignee: { select: assigneeSelect }, tasks: { where: { status: TaskStatus.ACTIVE } } },
      orderBy: { updatedAt: 'desc' },
    });

    const now = new Date();
    let decorated = leads.map((l) => decorateLead(l, now));

    // Поиск по телефону — по всем номерам карточки (main + доп.), считаем в памяти.
    if (q.phone) decorated = decorated.filter((l) => leadMatchesPhone(l, q.phone));

    // Task-based filters applied in-memory (depend on derived state).
    if (q.taskFilter === 'none') decorated = decorated.filter((l) => l.activeTaskCount === 0);
    else if (q.taskFilter === 'active') decorated = decorated.filter((l) => l.activeTaskCount > 0);
    else if (q.taskFilter === 'overdue') decorated = decorated.filter((l) => l.hasOverdueTasks);

    res.json(decorated);
  }),
);

/**
 * Глобальный поиск по базе — доступен ВСЕМ пользователям.
 * Возвращает минимум: можно увидеть, что компания уже в работе у другого менеджера,
 * но открыть чужой лид нельзя (поле `mine`).
 */
leadsRouter.get(
  '/lookup',
  validate({ query: lookupQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = String((req.query as any).query).trim();
    const all = await prisma.lead.findMany({
      select: {
        id: true, companyName: true, status: true, mainPhone: true, extraPhones: true,
        assigneeId: true, assignee: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ql = query.toLowerCase();
    const matched = all.filter(
      (l) => l.companyName.toLowerCase().includes(ql) || leadMatchesPhone(l, query),
    ).slice(0, 50);

    res.json(
      matched.map((l) => ({
        id: l.id,
        companyName: l.companyName,
        status: l.status,
        manager: l.assignee?.name ?? '—',
        mine: l.assigneeId === req.user!.id,
      })),
    );
  }),
);

leadsRouter.post(
  '/',
  validate({ body: createLeadSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body;
    let assigneeId = req.user!.id;
    if (isAdmin(req) && body.assigneeId) assigneeId = body.assigneeId;

    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) throw ApiError.badRequest('Ответственный менеджер не найден');

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          companyName: body.companyName,
          contactName: body.contactName,
          mainPhone: body.mainPhone,
          extraPhones: normalizeExtraPhones(body.extraPhones) as any,
          website: body.website || null,
          yandexMapsUrl: body.yandexMapsUrl || null,
          twoGisUrl: body.twoGisUrl || null,
          status: 'NEW',
          assigneeId,
        },
        include: { assignee: { select: assigneeSelect } },
      });
      await recordHistory(tx, {
        leadId: created.id,
        userId: req.user!.id,
        action: LeadHistoryAction.LEAD_CREATED,
        details: { companyName: created.companyName },
      });
      return created;
    });

    res.status(201).json({
      ...lead, extraPhones: normalizeExtraPhones(lead.extraPhones),
      nextTask: null, hasOverdueTasks: false, activeTaskCount: 0, overdueTaskCount: 0,
    });
  }),
);

/** Массовый импорт лидов (строки приходят из распарсенного на фронте Excel). */
leadsRouter.post(
  '/import',
  validate({ body: importLeadsSchema }),
  asyncHandler(async (req, res) => {
    const { leads, assigneeId: defaultAssignee } = req.body as {
      leads: any[]; assigneeId?: string;
    };

    // Кому назначать: менеджер — всегда себе; админ — выбранному (или себе).
    let baseAssignee = req.user!.id;
    if (isAdmin(req) && defaultAssignee) {
      const exists = await prisma.user.findUnique({ where: { id: defaultAssignee } });
      if (!exists) throw ApiError.badRequest('Выбранный ответственный не найден');
      baseAssignee = defaultAssignee;
    }

    const failed: { row: number; error: string }[] = [];
    let created = 0;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < leads.length; i++) {
        const row = leads[i];
        try {
          let assigneeId = baseAssignee;
          if (isAdmin(req) && row.assigneeId) assigneeId = row.assigneeId;

          const lead = await tx.lead.create({
            data: {
              companyName: row.companyName,
              contactName: row.contactName,
              mainPhone: row.mainPhone,
              extraPhones: normalizeExtraPhones(row.extraPhones) as any,
              website: row.website || null,
              yandexMapsUrl: row.yandexMapsUrl || null,
              twoGisUrl: row.twoGisUrl || null,
              status: 'NEW',
              assigneeId,
            },
          });
          await recordHistory(tx, {
            leadId: lead.id, userId: req.user!.id,
            action: LeadHistoryAction.LEAD_CREATED,
            details: { companyName: lead.companyName, imported: true },
          });
          created++;
        } catch (e: any) {
          failed.push({ row: i + 1, error: e?.message || 'Ошибка строки' });
        }
      }
    });

    res.status(201).json({ created, failedCount: failed.length, failed });
  }),
);

leadsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: { assignee: { select: assigneeSelect }, tasks: { where: { status: TaskStatus.ACTIVE } } },
    });
    assertLeadAccess(req.user!, lead);
    res.json(decorateLead(lead));
  }),
);

leadsRouter.patch(
  '/:id',
  validate({ body: updateLeadSchema }),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    assertLeadAccess(req.user!, lead);

    const data = { ...req.body };
    if (data.extraPhones !== undefined) data.extraPhones = normalizeExtraPhones(data.extraPhones);

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.lead.update({
        where: { id: req.params.id },
        data: {
          ...data,
          website: data.website === undefined ? undefined : data.website || null,
          yandexMapsUrl: data.yandexMapsUrl === undefined ? undefined : data.yandexMapsUrl || null,
          twoGisUrl: data.twoGisUrl === undefined ? undefined : data.twoGisUrl || null,
        },
        include: { assignee: { select: assigneeSelect } },
      });
      await recordHistory(tx, {
        leadId: u.id, userId: req.user!.id, action: LeadHistoryAction.LEAD_UPDATED,
        details: { changedFields: Object.keys(req.body) },
      });
      return u;
    });
    res.json({ ...updated, extraPhones: normalizeExtraPhones(updated.extraPhones) });
  }),
);

leadsRouter.delete(
  '/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

leadsRouter.patch(
  '/:id/status',
  validate({ body: statusSchema }),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    assertLeadAccess(req.user!, lead);
    if (lead!.status === req.body.status) return res.json(lead);

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.lead.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
        include: { assignee: { select: assigneeSelect } },
      });
      await recordHistory(tx, {
        leadId: u.id, userId: req.user!.id, action: LeadHistoryAction.STATUS_CHANGED,
        details: { from: lead!.status, to: req.body.status },
      });
      return u;
    });
    res.json(updated);
  }),
);

leadsRouter.patch(
  '/:id/assign',
  requireAdmin,
  validate({ body: assignSchema }),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) throw ApiError.notFound('Лид не найден');
    const assignee = await prisma.user.findUnique({ where: { id: req.body.assigneeId } });
    if (!assignee) throw ApiError.badRequest('Менеджер не найден');

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.lead.update({
        where: { id: req.params.id },
        data: { assigneeId: req.body.assigneeId },
        include: { assignee: { select: assigneeSelect } },
      });
      await recordHistory(tx, {
        leadId: u.id, userId: req.user!.id, action: LeadHistoryAction.ASSIGNEE_CHANGED,
        details: { from: lead.assigneeId, to: req.body.assigneeId },
      });
      return u;
    });
    res.json(updated);
  }),
);
