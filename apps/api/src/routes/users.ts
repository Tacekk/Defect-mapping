import { FastifyPluginAsync } from 'fastify';
import { createUserSchema, updateUserSchema } from '@glass-inspector/shared';
import { prisma } from '../utils/prisma.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import { handleError, NotFoundError } from '../utils/errors.js';
import { createAuditLog } from '../services/auditService.js';
import { hashPassword } from '../services/authService.js';

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all users (admin only)
  fastify.get('/', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          workstations: true,
          defaultWorkstation: true,
        },
        orderBy: { name: 'asc' },
      });

      // Remove password hashes
      const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);

      return reply.send({
        success: true,
        data: sanitizedUsers,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get single user
  fastify.get('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          workstations: true,
          defaultWorkstation: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const { passwordHash, ...sanitizedUser } = user;

      return reply.send({
        success: true,
        data: sanitizedUser,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Create user (admin only)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const data = createUserSchema.parse(request.body);

      const passwordHash = await hashPassword(data.password);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          role: data.role,
          defaultWorkstationId: data.defaultWorkstationId,
          workstations: data.workstationIds
            ? { connect: data.workstationIds.map((id) => ({ id })) }
            : undefined,
        },
        include: {
          workstations: true,
          defaultWorkstation: true,
        },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'CREATE',
        entityType: 'User',
        entityId: user.id,
        changes: { email: data.email, name: data.name, role: data.role },
      });

      const { passwordHash: _, ...sanitizedUser } = user;

      return reply.status(201).send({
        success: true,
        data: sanitizedUser,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Update user (admin only)
  fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateUserSchema.parse(request.body);

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('User not found');
      }

      const updateData: any = {
        email: data.email,
        name: data.name,
        role: data.role,
        defaultWorkstationId: data.defaultWorkstationId,
      };

      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
      }

      // Handle workstation updates
      if (data.workstationIds !== undefined) {
        updateData.workstations = {
          set: data.workstationIds.map((wsId) => ({ id: wsId })),
        };
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          workstations: true,
          defaultWorkstation: true,
        },
      });

      await createAuditLog({
        userId: request.user.userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: user.id,
        changes: { email: data.email, name: data.name, role: data.role },
      });

      const { passwordHash, ...sanitizedUser } = user;

      return reply.send({
        success: true,
        data: sanitizedUser,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete user (admin only)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Prevent self-deletion
      if (id === request.user.userId) {
        return reply.status(400).send({
          success: false,
          error: 'Cannot delete your own account',
        });
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundError('User not found');
      }

      await prisma.user.delete({ where: { id } });

      await createAuditLog({
        userId: request.user.userId,
        action: 'DELETE',
        entityType: 'User',
        entityId: id,
      });

      return reply.send({
        success: true,
        message: 'User deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default usersRoutes;
