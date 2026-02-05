import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { handleError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { config } from '../config.js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '..', '..', config.uploadDir);
const THUMBNAIL_WIDTH = 200;
const THUMBNAIL_HEIGHT = 200;
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1920;

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
}

const photosRoutes: FastifyPluginAsync = async (fastify) => {
  // Upload photo for a defect
  fastify.post('/defects/:defectId/photos', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { defectId } = request.params as { defectId: string };

      // Verify defect exists
      const defect = await prisma.defect.findUnique({ where: { id: defectId } });
      if (!defect) {
        throw new NotFoundError('Defect not found');
      }

      const data = await request.file();
      if (!data) {
        throw new BadRequestError('No file uploaded');
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Generate unique filename
      const id = randomUUID();
      const date = new Date().toISOString().slice(0, 10);
      const dir = join(UPLOADS_DIR, 'photos', date);
      await ensureDir(dir);

      const originalFilename = `${id}-original.jpg`;
      const thumbnailFilename = `${id}-thumb.jpg`;
      const originalPath = join(dir, originalFilename);
      const thumbnailPath = join(dir, thumbnailFilename);

      // Process and save original (resized if needed)
      await sharp(buffer)
        .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(originalPath);

      // Generate thumbnail
      await sharp(buffer)
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
          fit: 'cover',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Save to database
      const photo = await prisma.defectPhoto.create({
        data: {
          defectId,
          originalPath: `/uploads/photos/${date}/${originalFilename}`,
          thumbnailPath: `/uploads/photos/${date}/${thumbnailFilename}`,
        },
      });

      return reply.status(201).send({
        success: true,
        data: photo,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Delete photo
  fastify.delete('/:photoId', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { photoId } = request.params as { photoId: string };

      const photo = await prisma.defectPhoto.findUnique({ where: { id: photoId } });
      if (!photo) {
        throw new NotFoundError('Photo not found');
      }

      // Delete files from disk
      try {
        const originalPath = join(UPLOADS_DIR, photo.originalPath.replace('/uploads/', ''));
        const thumbnailPath = join(UPLOADS_DIR, photo.thumbnailPath.replace('/uploads/', ''));
        await unlink(originalPath).catch(() => {});
        await unlink(thumbnailPath).catch(() => {});
      } catch (e) {
        // Files may not exist, continue
      }

      // Delete from database
      await prisma.defectPhoto.delete({ where: { id: photoId } });

      return reply.send({
        success: true,
        message: 'Photo deleted',
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get photos for a defect
  fastify.get('/defects/:defectId/photos', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { defectId } = request.params as { defectId: string };

      const photos = await prisma.defectPhoto.findMany({
        where: { defectId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send({
        success: true,
        data: photos,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get all photos with pagination (for admin)
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    try {
      const query = request.query as {
        page?: string;
        pageSize?: string;
        productId?: string;
      };

      const page = parseInt(query.page || '1', 10);
      const pageSize = parseInt(query.pageSize || '24', 10);

      const whereClause: any = {};
      if (query.productId) {
        whereClause.defect = {
          item: {
            session: {
              productId: query.productId,
            },
          },
        };
      }

      const [photos, total] = await Promise.all([
        prisma.defectPhoto.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            defect: {
              include: {
                defectType: true,
                item: {
                  include: {
                    session: {
                      include: {
                        product: true,
                        user: {
                          select: { id: true, name: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.defectPhoto.count({ where: whereClause }),
      ]);

      return reply.send({
        success: true,
        data: {
          data: photos.map((photo) => ({
            ...photo,
            defectTypeName: photo.defect.defectType.name,
            defectTypeNameEn: photo.defect.defectType.nameEn,
            defectColor: photo.defect.defectType.color,
            productCode: photo.defect.item.session.product.code,
            productName: photo.defect.item.session.product.name,
            userName: photo.defect.item.session.user.name,
            sessionId: photo.defect.item.session.id,
          })),
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get recent photos (for board/dashboard)
  fastify.get('/recent', { preHandler: authenticate }, async (request, reply) => {
    try {
      const query = request.query as { limit?: string; productId?: string };
      const limit = Math.min(parseInt(query.limit || '12', 10), 50);

      const whereClause: any = {};
      if (query.productId) {
        whereClause.defect = {
          item: {
            session: {
              productId: query.productId,
            },
          },
        };
      }

      const photos = await prisma.defectPhoto.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          defect: {
            include: {
              defectType: true,
              item: {
                include: {
                  session: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return reply.send({
        success: true,
        data: photos.map((photo) => ({
          ...photo,
          defectTypeName: photo.defect.defectType.name,
          defectTypeNameEn: photo.defect.defectType.nameEn,
          defectColor: photo.defect.defectType.color,
          productCode: photo.defect.item.session.product.code,
          productName: photo.defect.item.session.product.name,
        })),
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default photosRoutes;
