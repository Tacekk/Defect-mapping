import bcrypt from 'bcryptjs';
import { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { config } from '../config.js';
import { UnauthorizedError, NotFoundError, ConflictError } from '../utils/errors.js';
import { LoginInput, CreateUserInput, Role } from '@glass-inspector/shared';
import { logger } from '../utils/logger.js';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(
  fastify: FastifyInstance,
  { email, password }: LoginInput
) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      workstations: true,
      defaultWorkstation: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = fastify.jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
    },
    { expiresIn: config.jwt.expiresIn }
  );

  const refreshToken = fastify.jwt.sign(
    {
      userId: user.id,
      tokenType: 'refresh' as const,
    },
    { 
      expiresIn: config.jwt.refreshExpiresIn,
      key: config.jwt.refreshSecret,
    }
  );

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  logger.info('User logged in', { userId: user.id, email: user.email });

  // Return user without password hash
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(
  fastify: FastifyInstance,
  refreshToken: string
) {
  // Verify refresh token exists and is valid
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    // Delete expired token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });
    throw new UnauthorizedError('Refresh token expired');
  }

  // Delete old refresh token
  await prisma.refreshToken.delete({
    where: { id: storedToken.id },
  });

  // Generate new tokens
  const accessToken = fastify.jwt.sign(
    {
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role as Role,
    },
    { expiresIn: config.jwt.expiresIn }
  );

  const newRefreshToken = fastify.jwt.sign(
    {
      userId: storedToken.user.id,
      tokenType: 'refresh' as const,
    },
    { 
      expiresIn: config.jwt.refreshExpiresIn,
      key: config.jwt.refreshSecret,
    }
  );

  // Store new refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: storedToken.user.id,
      expiresAt,
    },
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logout(userId: string, refreshToken?: string): Promise<void> {
  if (refreshToken) {
    // Delete specific refresh token
    await prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
  } else {
    // Delete all refresh tokens for user (logout from all devices)
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  logger.info('User logged out', { userId });
}

export async function createUser(data: CreateUserInput) {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

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

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      workstations: true,
      defaultWorkstation: true,
    },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
