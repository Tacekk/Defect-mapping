import { FastifyPluginAsync } from 'fastify';
import { createDefectTypeSchema, updateDefectTypeSchema } from '@glass-inspector/shared';
import { prisma } from '../utils/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { handleError, NotFoundError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';

const defectTypesRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all defect types
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const defectTypes = await prisma.defectType.findMany({
        where: { isActive: true },
        orderBy: { severity: 'desc' },
      });

      return reply.send({
        success: true,
        data: defectTypes,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single defect type
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const defectType = await prisma.defectType.findUnique({
        where: { id },
      });

      if (!defectType) {
        throw new NotFoundError('Defect type not found');
      }

      return reply.send({
        success: true,
        data: defectType,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create defect type (admin only)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const data = createDefectTypeSchema.parse(request.body);

      const defectType = await prisma.defectType.create({
        data,
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'CREATE',
        entityType: 'DefectType',
        entityId: defectType.id,
        changes: data,
      });

      return reply.status(201).send({
        success: true,
        data: defectType,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update defect type (admin only)
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateDefectTypeSchema.parse(request.body);

      const existing = await prisma.defectType.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Defect type not found');
      }

      const defectType = await prisma.defectType.update({
        where: { id },
        data,
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'UPDATE',
        entityType: 'DefectType',
        entityId: defectType.id,
        changes: data,
      });

      return reply.send({
        success: true,
        data: defectType,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete defect type (admin only)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await prisma.defectType.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Defect type not found');
      }

      await prisma.defectType.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'DELETE',
        entityType: 'DefectType',
        entityId: id,
      });

      return reply.send({
        success: true,
        message: 'Defect type deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default defectTypesRoutes;
