import { FastifyRequest, FastifyReply } from 'fastify';
import { Role } from '@glass-inspector/shared';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export interface JWTPayload {
  userId: string;
  email?: string;
  role?: Role;
  tokenType?: 'refresh';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply);
    
    const userRole = request.user.role;
    if (!userRole || !roles.includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

export function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return requireRole(Role.ADMIN)(request, reply);
}

export function requireQualityOrAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return requireRole(Role.ADMIN, Role.QUALITY)(request, reply);
}

export function requireInspector(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return requireRole(Role.ADMIN, Role.QUALITY, Role.INSPECTOR)(request, reply);
}
