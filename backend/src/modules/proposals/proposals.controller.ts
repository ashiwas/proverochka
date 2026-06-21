import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/errors';
import { validate } from '../../middleware/validate';
import { authenticate, AuthUser } from '../../middleware/auth';
import { requireAdmin, isAdmin } from '../../middleware/roles';
import { Role } from '@prisma/client';
import {
  slideCreateSchema, slideUpdateSchema, slideReorderSchema,
  proposalCreateSchema, proposalUpdateSchema, proposalPreviewSchema,
} from './proposals.schemas';
import { buildProposalPdf, measureSlide, isSupportedSlideMime } from './proposals.pdf';

/** Собрать PDF из набора слайдов (в заданном порядке) и цен. */
async function renderPdf(slideIds: string[], priceOriginal?: number | null, priceDiscounted?: number | null) {
  const slides = await prisma.proposalSlide.findMany({ where: { id: { in: slideIds } } });
  const byId = new Map(slides.map((s) => [s.id, s]));
  const ordered = slideIds.map((id) => byId.get(id)).filter(Boolean) as typeof slides;
  return buildProposalPdf({
    slides: ordered.map((s) => ({
      data: s.data,
      mimeType: s.mimeType,
      isPriceSlide: s.isPriceSlide,
      priceX: s.priceX,
      priceY: s.priceY,
      priceFontSize: s.priceFontSize,
      priceAlign: s.priceAlign,
      priceColor: s.priceColor,
    })),
    priceOriginal,
    priceDiscounted,
  });
}

export const proposalsRouter = Router();
proposalsRouter.use(authenticate);

// Файлы слайдов держим в памяти и кладём байтами в БД. До 30 МБ на слайд.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

/** Обёртка над multer.single, переводящая ошибки multer в аккуратные ApiError. */
const uploadSingle =
  (field: string) => (req: Request, res: Response, next: NextFunction) =>
    upload.single(field)(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Файл слишком большой (макс. 30 МБ)'));
        return next(ApiError.badRequest('Ошибка загрузки файла'));
      }
      next(err);
    });

// Проекция метаданных слайда — без тяжёлого поля `data`.
const slideMetaSelect = {
  id: true, title: true, fileName: true, mimeType: true,
  pageWidth: true, pageHeight: true, isPriceSlide: true,
  priceX: true, priceY: true, priceFontSize: true, priceAlign: true, priceColor: true,
  sortOrder: true, createdAt: true, updatedAt: true,
} as const;

const proposalSelect = {
  id: true, title: true, slideIds: true, priceOriginal: true, priceDiscounted: true,
  leadId: true, createdAt: true, updatedAt: true,
  author: { select: { id: true, name: true } },
  lead: { select: { id: true, companyName: true } },
} as const;

function assertProposalAccess(user: AuthUser, proposal: { authorId: string } | null) {
  if (!proposal) throw ApiError.notFound('КП не найдено');
  if (user.role === Role.ADMIN) return;
  if (proposal.authorId !== user.id) throw ApiError.forbidden('Это не ваше КП');
}

/* ───────────────────────────── Слайды-заготовки (конструктор) ───────────────────────────── */

// Список слайдов виден всем авторизованным — менеджеру нужно выбирать из них КП.
proposalsRouter.get(
  '/slides',
  asyncHandler(async (_req, res) => {
    const slides = await prisma.proposalSlide.findMany({
      select: slideMetaSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(slides);
  }),
);

// Содержимое файла слайда (PDF/картинка) — для превью в конструкторе и билдере КП.
proposalsRouter.get(
  '/slides/:id/file',
  asyncHandler(async (req, res) => {
    const slide = await prisma.proposalSlide.findUnique({ where: { id: req.params.id } });
    if (!slide) throw ApiError.notFound('Слайд не найден');
    res.setHeader('Content-Type', slide.mimeType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(Buffer.from(slide.data));
  }),
);

proposalsRouter.post(
  '/slides',
  requireAdmin,
  uploadSingle('file'),
  validate({ body: slideCreateSchema }),
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file) throw ApiError.badRequest('Файл слайда обязателен');
    if (!isSupportedSlideMime(file.mimetype)) {
      throw ApiError.badRequest('Поддерживаются только PDF, PNG и JPEG');
    }

    let dims: { width: number; height: number };
    try {
      dims = await measureSlide(file.buffer, file.mimetype);
    } catch {
      throw ApiError.badRequest('Не удалось прочитать файл слайда');
    }

    const body = req.body as any;
    // Имя файла из multipart приходит в latin1 — возвращаем кириллице нормальный вид.
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // Новые слайды добавляем в конец общего порядка.
    const total = await prisma.proposalSlide.count();

    const slide = await prisma.proposalSlide.create({
      data: {
        title: body.title,
        fileName,
        mimeType: file.mimetype,
        data: file.buffer,
        pageWidth: dims.width,
        pageHeight: dims.height,
        isPriceSlide: body.isPriceSlide,
        priceX: body.priceX,
        priceY: body.priceY,
        priceFontSize: body.priceFontSize,
        priceAlign: body.priceAlign,
        priceColor: body.priceColor,
        sortOrder: total,
      },
      select: slideMetaSelect,
    });
    res.status(201).json(slide);
  }),
);

proposalsRouter.patch(
  '/slides/:id',
  requireAdmin,
  validate({ body: slideUpdateSchema }),
  asyncHandler(async (req, res) => {
    const exists = await prisma.proposalSlide.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) throw ApiError.notFound('Слайд не найден');
    const slide = await prisma.proposalSlide.update({
      where: { id: req.params.id },
      data: req.body,
      select: slideMetaSelect,
    });
    res.json(slide);
  }),
);

proposalsRouter.post(
  '/slides/reorder',
  requireAdmin,
  validate({ body: slideReorderSchema }),
  asyncHandler(async (req, res) => {
    const { order } = req.body as { order: string[] };
    const existing = await prisma.proposalSlide.findMany({
      where: { id: { in: order } },
      select: { id: true },
    });
    const present = new Set(existing.map((s) => s.id));
    const ops = order
      .filter((id) => present.has(id))
      .map((id, i) => prisma.proposalSlide.update({ where: { id }, data: { sortOrder: i } }));
    await prisma.$transaction(ops);
    res.json({ ok: true });
  }),
);

proposalsRouter.delete(
  '/slides/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const exists = await prisma.proposalSlide.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) throw ApiError.notFound('Слайд не найден');
    await prisma.proposalSlide.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

/* ───────────────────────────── КП (коммерческие предложения) ───────────────────────────── */

async function ensureSlidesExist(slideIds: string[]) {
  const found = await prisma.proposalSlide.findMany({ where: { id: { in: slideIds } }, select: { id: true } });
  if (found.length !== new Set(slideIds).size) throw ApiError.badRequest('Некоторые слайды не найдены');
}

// Если КП привязывается к лиду — проверяем доступ к этому лиду.
async function ensureLeadAccess(user: AuthUser, leadId: string | null | undefined) {
  if (!leadId) return;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, deletedAt: null }, select: { assigneeId: true } });
  if (!lead) throw ApiError.badRequest('Лид не найден');
  if (user.role !== Role.ADMIN && lead.assigneeId !== user.id) throw ApiError.forbidden('Это не ваш лид');
}

proposalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = isAdmin(req) ? {} : { authorId: req.user!.id };
    const items = await prisma.proposal.findMany({
      where,
      select: proposalSelect,
      orderBy: { updatedAt: 'desc' },
    });
    res.json(items.map((p) => ({ ...p, slideCount: Array.isArray(p.slideIds) ? p.slideIds.length : 0 })));
  }),
);

// Предпросмотр КП без сохранения — отдаём собранный PDF на лету.
proposalsRouter.post(
  '/preview-pdf',
  validate({ body: proposalPreviewSchema }),
  asyncHandler(async (req, res) => {
    const { slideIds, priceOriginal, priceDiscounted } = req.body as {
      slideIds: string[]; priceOriginal?: number | null; priceDiscounted?: number | null;
    };
    await ensureSlidesExist(slideIds);
    const pdf = await renderPdf(slideIds, priceOriginal ?? null, priceDiscounted ?? null);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(Buffer.from(pdf));
  }),
);

proposalsRouter.post(
  '/',
  validate({ body: proposalCreateSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as any;
    await ensureSlidesExist(body.slideIds);
    await ensureLeadAccess(req.user!, body.leadId);

    const proposal = await prisma.proposal.create({
      data: {
        title: body.title,
        slideIds: body.slideIds,
        priceOriginal: body.priceOriginal ?? null,
        priceDiscounted: body.priceDiscounted ?? null,
        leadId: body.leadId ?? null,
        authorId: req.user!.id,
      },
      select: proposalSelect,
    });
    res.status(201).json(proposal);
  }),
);

proposalsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id }, select: proposalSelect });
    assertProposalAccess(req.user!, proposal as any);
    res.json(proposal);
  }),
);

proposalsRouter.patch(
  '/:id',
  validate({ body: proposalUpdateSchema }),
  asyncHandler(async (req, res) => {
    const current = await prisma.proposal.findUnique({ where: { id: req.params.id }, select: { authorId: true } });
    assertProposalAccess(req.user!, current);

    const body = req.body as any;
    if (body.slideIds) await ensureSlidesExist(body.slideIds);
    if (body.leadId !== undefined) await ensureLeadAccess(req.user!, body.leadId);

    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: {
        title: body.title,
        slideIds: body.slideIds,
        priceOriginal: body.priceOriginal,
        priceDiscounted: body.priceDiscounted,
        leadId: body.leadId,
      },
      select: proposalSelect,
    });
    res.json(proposal);
  }),
);

proposalsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const current = await prisma.proposal.findUnique({ where: { id: req.params.id }, select: { authorId: true } });
    assertProposalAccess(req.user!, current);
    await prisma.proposal.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

// Готовый КП в PDF — собирается на лету, поэтому доступен «в любое время».
proposalsRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const proposal = await prisma.proposal.findUnique({ where: { id: req.params.id } });
    assertProposalAccess(req.user!, proposal as any);

    const ids = (Array.isArray(proposal!.slideIds) ? proposal!.slideIds : []) as string[];
    const pdf = await renderPdf(ids, proposal!.priceOriginal, proposal!.priceDiscounted);

    const safeName = (proposal!.title || 'КП').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 80);
    const asciiName = safeName.replace(/[^\x20-\x7E]+/g, '_') || 'proposal';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}.pdf`,
    );
    res.send(Buffer.from(pdf));
  }),
);
