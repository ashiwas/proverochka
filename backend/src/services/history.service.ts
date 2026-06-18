import { LeadHistoryAction, Prisma, PrismaClient } from '@prisma/client';

type Client = PrismaClient | Prisma.TransactionClient;

export function recordHistory(
  client: Client,
  params: { leadId: string; userId: string; action: LeadHistoryAction; details?: Prisma.InputJsonValue },
) {
  return client.leadHistory.create({
    data: {
      leadId: params.leadId,
      userId: params.userId,
      action: params.action,
      details: params.details,
    },
  });
}
