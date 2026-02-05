import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import prismaPlugin from './plugins/prisma.js';
import authRoutes from './routes/auth.js';
import healthRoutes from './routes/health.js';
import productsRoutes from './routes/products.js';
import workstationsRoutes from './routes/workstations.js';
import defectTypesRoutes from './routes/defectTypes.js';
import sessionsRoutes from './routes/sessions.js';
import usersRoutes from './routes/users.js';
import auditLogsRoutes from './routes/auditLogs.js';
import photosRoutes from './routes/photos.js';
import analyticsRoutes from './routes/analytics.js';
import templatesRoutes from './routes/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildApp() {
  const fastify = Fastify({
    logger: config.isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
            },
          },
        }
      : true,
  });

  // Register plugins
  await fastify.register(cors, {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: config.isProd,
  });

  await fastify.register(sensible);

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(jwt, {
    secret: config.jwt.secret,
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: config.maxFileSize,
    },
  });

  // Static files for uploads
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '..', config.uploadDir),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Database plugin
  await fastify.register(prismaPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(productsRoutes, { prefix: '/api/products' });
  await fastify.register(workstationsRoutes, { prefix: '/api/workstations' });
  await fastify.register(defectTypesRoutes, { prefix: '/api/defect-types' });
  await fastify.register(sessionsRoutes, { prefix: '/api/sessions' });
  await fastify.register(usersRoutes, { prefix: '/api/users' });
  await fastify.register(auditLogsRoutes, { prefix: '/api/audit-logs' });
  await fastify.register(photosRoutes, { prefix: '/api/photos' });
  await fastify.register(analyticsRoutes, { prefix: '/api/analytics' });
  await fastify.register(templatesRoutes, { prefix: '/api/templates' });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    reply.status(error.statusCode || 500).send({
      success: false,
      error: error.message || 'Internal server error',
    });
  });

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();

    await app.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(`Server started on http://${config.host}:${config.port}`);
    logger.info(`Environment: ${config.isDev ? 'development' : 'production'}`);
  } catch (err) {
    logger.error('Failed to start server', { error: String(err) });
    process.exit(1);
  }
}

start();
