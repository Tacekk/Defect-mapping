import { FastifyPluginAsync } from 'fastify';
import { loginSchema, refreshTokenSchema } from '@glass-inspector/shared';
import { login, refreshAccessToken, logout, getUserById } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { handleError, BadRequestError } from '../utils/errors.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await login(fastify, body);
      
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Refresh token
  fastify.post('/refresh', async (request, reply) => {
    try {
      const body = refreshTokenSchema.parse(request.body);
      const result = await refreshAccessToken(fastify, body.refreshToken);
      
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Logout
  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    try {
      const body = request.body as { refreshToken?: string };
      await logout(request.user.userId, body?.refreshToken);
      
      return reply.send({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get current user
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    try {
      const user = await getUserById(request.user.userId);
      
      return reply.send({
        success: true,
        data: user,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default authRoutes;
