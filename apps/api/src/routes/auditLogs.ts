import { FastifyPluginAsync } from 'fastify';
import { requireAdmin } from '../middleware/auth.js';
import { handleError } from '../utils/errors.js';
import { getAuditLogs } from '../services/auditService.js';

const auditLogsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get audit logs (admin only)
  fastify.get('/', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const query = request.query as {
        page?: string;
        pageSize?: string;
        entityType?: string;
        userId?: string;
        startDate?: string;
        endDate?: string;
      };

      const result = await getAuditLogs({
        page: query.page ? parseInt(query.page, 10) : 1,
        pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 50,
        entityType: query.entityType,
        userId: query.userId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default auditLogsRoutes;
