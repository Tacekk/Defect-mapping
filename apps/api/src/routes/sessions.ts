import { FastifyPluginAsync } from 'fastify';
import { createSessionSchema, updateSessionSchema, createItemSchema, createDefectSchema } from '@glass-inspector/shared';
import { prisma } from '../utils/prisma.js';
import { authenticate, requireInspector, requireAdmin } from '../middleware/auth.js';
import { handleError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';

const sessionsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all sessions (with filters)
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const query = request.query as {
        productId?: string;
        workstationId?: string;
        userId?: string;
        status?: string;
        page?: string;
        pageSize?: string;
      };

      const page = parseInt(query.page || '1', 10);
      const pageSize = parseInt(query.pageSize || '20', 10);

      const where = {
        ...(query.productId && { productId: query.productId }),
        ...(query.workstationId && { workstationId: query.workstationId }),
        ...(query.userId && { userId: query.userId }),
        ...(query.status && { status: query.status as any }),
      };

      const [sessions, total] = await Promise.all([
        prisma.session.findMany({
          where,
          include: {
            product: true,
            workstation: true,
            user: {
              select: { id: true, name: true, email: true },
            },
            items: {
              select: {
                status: true,
                defects: {
                  select: {
                    id: true,
                    photos: {
                      select: { id: true },
                      take: 1, // Only need to know if any photos exist
                    },
                  },
                },
              },
            },
          },
          orderBy: { startedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.session.count({ where }),
      ]);

      // Calculate stats for each session
      const sessionsWithStats = sessions.map((session) => {
        const itemsCount = session.items.length;
        const defectiveItems = session.items.filter((i) => i.status === 'DEFECTIVE').length;
        const totalDefects = session.items.reduce((sum, item) => sum + item.defects.length, 0);
        const hasPhotos = session.items.some((item) =>
          item.defects.some((defect) => defect.photos.length > 0)
        );
        const defectRate = itemsCount > 0 ? (defectiveItems / itemsCount) * 100 : 0;

        // Remove items from response to keep payload small
        const { items, ...sessionWithoutItems } = session;

        return {
          ...sessionWithoutItems,
          _count: { items: itemsCount },
          _stats: {
            defectiveItems,
            totalDefects,
            defectRate,
            hasPhotos,
          },
        };
      });

      return reply.send({
        success: true,
        data: {
          data: sessionsWithStats,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single session
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          product: true,
          workstation: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              defects: {
                include: {
                  defectType: true,
                  photos: true,
                },
              },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (!session) {
        throw new NotFoundError('Session not found');
      }

      return reply.send({
        success: true,
        data: session,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create session
  fastify.post('/', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const data = createSessionSchema.parse(request.body);

      const session = await prisma.session.create({
        data: {
          ...data,
          userId: request.user.userId,
        },
        include: {
          product: true,
          workstation: true,
        },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'CREATE',
        entityType: 'Session',
        entityId: session.id,
        changes: data,
      });

      return reply.status(201).send({
        success: true,
        data: session,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update session
  fastify.patch('/:id', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateSessionSchema.parse(request.body);

      const existing = await prisma.session.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Session not found');
      }

      // Only owner or admin can update
      if (existing.userId !== request.user.userId && request.user.role !== 'ADMIN') {
        throw new ForbiddenError('Not authorized to update this session');
      }

      const updateData: any = { ...data };
      if (data.status === 'CLOSED' && !existing.endedAt) {
        updateData.endedAt = new Date();
      }

      const session = await prisma.session.update({
        where: { id },
        data: updateData,
        include: {
          product: true,
          workstation: true,
        },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'UPDATE',
        entityType: 'Session',
        entityId: session.id,
        changes: data,
      });

      return reply.send({
        success: true,
        data: session,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Takeover session (reassign to current user)
  fastify.post('/:id/takeover', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const session = await prisma.session.findUnique({
        where: { id },
        include: {
          product: true,
          workstation: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              defects: {
                include: {
                  defectType: true,
                },
              },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (!session) {
        throw new NotFoundError('Session not found');
      }

      if (session.status === 'CLOSED') {
        throw new ForbiddenError('Cannot takeover a closed session');
      }

      const previousUserId = session.userId;

      // Reassign session to current user
      const updatedSession = await prisma.session.update({
        where: { id },
        data: {
          userId: request.user.userId,
          status: 'OPEN',
        },
        include: {
          product: true,
          workstation: true,
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              defects: {
                include: {
                  defectType: true,
                },
              },
            },
            orderBy: { sequence: 'asc' },
          },
        },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'UPDATE',
        entityType: 'Session',
        entityId: session.id,
        changes: {
          action: 'TAKEOVER',
          previousUserId,
          newUserId: request.user.userId,
        },
      });

      return reply.send({
        success: true,
        data: updatedSession,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete session (admin only)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await prisma.session.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Session not found');
      }

      await prisma.session.delete({ where: { id } });

      await createAuditLog({
        userId: request.user.userId,
        action: 'DELETE',
        entityType: 'Session',
        entityId: id,
      });

      return reply.send({
        success: true,
        message: 'Session deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Add item to session
  fastify.post('/:id/items', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const { id: sessionId } = request.params as { id: string };

      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        throw new NotFoundError('Session not found');
      }

      // Get next sequence number
      const lastItem = await prisma.item.findFirst({
        where: { sessionId },
        orderBy: { sequence: 'desc' },
      });

      const sequence = (lastItem?.sequence || 0) + 1;

      const item = await prisma.item.create({
        data: {
          sessionId,
          sequence,
          status: 'OK',
        },
        include: {
          defects: {
            include: {
              defectType: true,
              photos: true,
            },
          },
        },
      });

      return reply.status(201).send({
        success: true,
        data: item,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Add defect to item
  fastify.post('/items/:itemId/defects', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const { itemId } = request.params as { itemId: string };
      const data = createDefectSchema.parse({ ...request.body, itemId });

      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) {
        throw new NotFoundError('Item not found');
      }

      const defect = await prisma.defect.create({
        data: {
          itemId,
          defectTypeId: data.defectTypeId,
          positionX: data.positionX,
          positionY: data.positionY,
          severity: data.severity,
          notes: data.notes,
        },
        include: {
          defectType: true,
          photos: true,
        },
      });

      // Update item status to DEFECTIVE
      await prisma.item.update({
        where: { id: itemId },
        data: { status: 'DEFECTIVE' },
      });

      return reply.status(201).send({
        success: true,
        data: defect,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update defect
  fastify.patch('/defects/:defectId', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const { defectId } = request.params as { defectId: string };
      const data = request.body as { defectTypeId?: string; severity?: number; notes?: string };

      const defect = await prisma.defect.findUnique({
        where: { id: defectId },
      });

      if (!defect) {
        throw new NotFoundError('Defect not found');
      }

      const updatedDefect = await prisma.defect.update({
        where: { id: defectId },
        data: {
          ...(data.defectTypeId && { defectTypeId: data.defectTypeId }),
          ...(data.severity !== undefined && { severity: data.severity }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
        include: {
          defectType: true,
          photos: true,
        },
      });

      return reply.send({
        success: true,
        data: updatedDefect,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete defect
  fastify.delete('/defects/:defectId', { preHandler: requireInspector }, async (request, reply) => {
    try {
      const { defectId } = request.params as { defectId: string };

      const defect = await prisma.defect.findUnique({
        where: { id: defectId },
        include: { item: true, photos: true },
      });

      if (!defect) {
        throw new NotFoundError('Defect not found');
      }

      // Delete photos first (explicit cascade)
      if (defect.photos && defect.photos.length > 0) {
        await prisma.defectPhoto.deleteMany({
          where: { defectId: defectId },
        });
      }

      // Delete the defect
      await prisma.defect.delete({ where: { id: defectId } });

      // Check if item has any remaining defects
      const remainingDefects = await prisma.defect.count({
        where: { itemId: defect.itemId },
      });

      if (remainingDefects === 0) {
        await prisma.item.update({
          where: { id: defect.itemId },
          data: { status: 'OK' },
        });
      }

      return reply.send({
        success: true,
        message: 'Defect deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default sessionsRoutes;
