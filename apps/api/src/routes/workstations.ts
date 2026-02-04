import { FastifyPluginAsync } from 'fastify';
import { createWorkstationSchema, updateWorkstationSchema } from '@glass-inspector/shared';
import { prisma } from '../utils/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { handleError, NotFoundError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';

const workstationsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all workstations
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const workstations = await prisma.workstation.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      return reply.send({
        success: true,
        data: workstations,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single workstation
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const workstation = await prisma.workstation.findUnique({
        where: { id },
        include: {
          users: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!workstation) {
        throw new NotFoundError('Workstation not found');
      }

      return reply.send({
        success: true,
        data: workstation,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create workstation (admin only)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const data = createWorkstationSchema.parse(request.body);

      const workstation = await prisma.workstation.create({
        data,
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'CREATE',
        entityType: 'Workstation',
        entityId: workstation.id,
        changes: data,
      });

      return reply.status(201).send({
        success: true,
        data: workstation,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update workstation (admin only)
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateWorkstationSchema.parse(request.body);

      const existing = await prisma.workstation.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Workstation not found');
      }

      const workstation = await prisma.workstation.update({
        where: { id },
        data,
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'UPDATE',
        entityType: 'Workstation',
        entityId: workstation.id,
        changes: data,
      });

      return reply.send({
        success: true,
        data: workstation,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete workstation (admin only)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await prisma.workstation.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Workstation not found');
      }

      await prisma.workstation.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'DELETE',
        entityType: 'Workstation',
        entityId: id,
      });

      return reply.send({
        success: true,
        message: 'Workstation deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default workstationsRoutes;
