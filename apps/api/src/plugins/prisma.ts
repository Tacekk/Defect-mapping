import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { prisma, connectDatabase, disconnectDatabase } from '../utils/prisma.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  await connectDatabase();
  
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await disconnectDatabase();
  });
};

export default fp(prismaPlugin, {
  name: 'prisma',
});
