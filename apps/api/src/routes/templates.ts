import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import { handleError, NotFoundError, BadRequestError } from '../utils/errors.js';
import { config } from '../config.js';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADS_DIR = join(__dirname, '..', '..', config.uploadDir);
const TEMPLATE_MAX_WIDTH = 1200;
const TEMPLATE_MAX_HEIGHT = 1200;

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
  } catch (e) {
    // Directory already exists
  }
}

const templatesRoutes: FastifyPluginAsync = async (fastify) => {
  // Upload template for a product
  fastify.post('/products/:productId/template', { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { productId } = request.params as { productId: string };

      // Verify product exists
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const data = await request.file();
      if (!data) {
        throw new BadRequestError('No file uploaded');
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Generate unique filename
      const id = randomUUID();
      const dir = join(UPLOADS_DIR, 'templates');
      await ensureDir(dir);

      const filename = `${id}.png`;
      const filepath = join(dir, filename);

      // Process and save template image
      const image = sharp(buffer);
      const metadata = await image.metadata();

      await image
        .resize(TEMPLATE_MAX_WIDTH, TEMPLATE_MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png({ quality: 90 })
        .toFile(filepath);

      // Get processed image dimensions
      const processedMetadata = await sharp(filepath).metadata();

      // Update product with template path and dimensions
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          templateImage: `/uploads/templates/${filename}`,
          templateWidth: processedMetadata.width || TEMPLATE_MAX_WIDTH,
          templateHeight: processedMetadata.height || TEMPLATE_MAX_HEIGHT,
        },
      });

      return reply.send({
        success: true,
        data: updatedProduct,
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get template image
  fastify.get('/products/:productId/template', { preHandler: authenticate }, async (request, reply) => {
    try {
      const { productId } = request.params as { productId: string };

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          templateImage: true,
          templateWidth: true,
          templateHeight: true,
        },
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
};

export default templatesRoutes;
