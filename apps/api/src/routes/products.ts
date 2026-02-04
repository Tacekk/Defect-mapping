import { FastifyPluginAsync } from 'fastify';
import { createProductSchema, updateProductSchema } from '@glass-inspector/shared';
import { prisma } from '../utils/prisma.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { handleError, NotFoundError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';

const productsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all products
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      });

      return reply.send({
        success: true,
        data: products,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single product
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return reply.send({
        success: true,
        data: product,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create product (admin only)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const data = createProductSchema.parse(request.body);

      const product = await prisma.product.create({
        data,
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'CREATE',
        entityType: 'Product',
        entityId: product.id,
        changes: data,
      });

      return reply.status(201).send({
        success: true,
        data: product,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update product (admin only)
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateProductSchema.parse(request.body);

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Product not found');
      }

      const product = await prisma.product.update({
        where: { id },
        data,
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'UPDATE',
        entityType: 'Product',
        entityId: product.id,
        changes: data,
      });

      return reply.send({
        success: true,
        data: product,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete product (admin only)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('Product not found');
      }

      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'DELETE',
        entityType: 'Product',
        entityId: id,
      });

      return reply.send({
        success: true,
        message: 'Product deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default productsRoutes;
