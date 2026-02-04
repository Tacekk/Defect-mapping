import { prisma } from '../utils/prisma.js';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLogInput {
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes || null,
    },
  });
}

export async function getAuditLogs(options: {
  page?: number;
  pageSize?: number;
  entityType?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    pageSize = 20,
    entityType,
    userId,
    startDate,
    endDate,
  } = options;

  const where = {
    ...(entityType && { entityType }),
    ...(userId && { userId }),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
