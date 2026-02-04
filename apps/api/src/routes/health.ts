import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma.js';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      return reply.send({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
        },
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'disconnected',
        },
      });
    }
  });

  fastify.get('/ready', async (request, reply) => {
    return reply.send({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });
};

export default healthRoutes;
