import { Router } from 'express';
import { prisma } from '../../prisma';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { assertLeadAccess } from '../../services/access';

// Mounted at /leads/:id/history
export const leadHistoryRouter = Router({ mergeParams: true });
leadHistoryRouter.use(authenticate);

leadHistoryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, deletedAt: null } });
    assertLeadAccess(req.user!, lead);
    const history = await prisma.leadHistory.findMany({
      where: { leadId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(history);
  }),
);
