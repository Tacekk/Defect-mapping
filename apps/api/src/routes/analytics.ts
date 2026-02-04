import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authenticate, requireQualityOrAdmin } from '../middleware/auth.js';
import { handleError, BadRequestError } from '../utils/errors.js';

const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get KPI metrics
  fastify.get('/kpi', { preHandler: authenticate }, async (request, reply) => {
    try {
      const query = request.query as {
        productId?: string;
        period?: string;
      };

      // Calculate date range
      let startDate: Date | undefined;
      const now = new Date();
      
      switch (query.period) {
        case '7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90days':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
        // 'all' - no date filter
      }

      const where = {
        ...(query.productId && { session: { productId: query.productId } }),
        ...(startDate && { createdAt: { gte: startDate } }),
      };

      // Total items inspected
      const totalItemsInspected = await prisma.item.count({ where });

      // Defective items
      const defectiveItems = await prisma.item.count({
        where: { ...where, status: 'DEFECTIVE' },
      });

      // Calculate defect rate
      const defectRate = totalItemsInspected > 0 
        ? defectiveItems / totalItemsInspected 
        : 0;

      // Total defects
      const totalDefects = await prisma.defect.count({
        where: {
          item: where,
        },
      });

      // Average defects per defective item
      const avgDefectsPerItem = defectiveItems > 0 
        ? totalDefects / defectiveItems 
        : 0;

      // Top defect types
      const defectsByType = await prisma.defect.groupBy({
        by: ['defectTypeId'],
        _count: true,
        where: {
          item: where,
        },
        orderBy: {
          _count: {
            defectTypeId: 'desc',
          },
        },
        take: 10,
      });

      const defectTypeIds = defectsByType.map(d => d.defectTypeId);
      const defectTypes = await prisma.defectType.findMany({
        where: { id: { in: defectTypeIds } },
      });

      const topDefectTypes = defectsByType.map((d) => {
        const type = defectTypes.find((t) => t.id === d.defectTypeId);
        return {
          defectType: type,
          count: d._count,
          percentage: totalDefects > 0 ? d._count / totalDefects : 0,
        };
      });

      // Calculate trend (compare to previous period)
      let defectRateTrend = 0;
      if (startDate) {
        const periodDays = query.period === '7days' ? 7 : query.period === '30days' ? 30 : 90;
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - periodDays);

        const previousWhere = {
          ...(query.productId && { session: { productId: query.productId } }),
          createdAt: { gte: previousStartDate, lt: startDate },
        };

        const prevTotal = await prisma.item.count({ where: previousWhere });
        const prevDefective = await prisma.item.count({
          where: { ...previousWhere, status: 'DEFECTIVE' },
        });
        const prevRate = prevTotal > 0 ? prevDefective / prevTotal : 0;

        defectRateTrend = prevRate > 0 ? (defectRate - prevRate) / prevRate : 0;
      }

      return reply.send({
        success: true,
        data: {
          totalItemsInspected,
          defectiveItems,
          defectRate,
          defectRateTrend,
          totalDefects,
          avgDefectsPerItem,
          topDefectTypes,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get heatmap data
  fastify.get('/heatmap', { preHandler: authenticate }, async (request, reply) => {
    try {
      const query = request.query as {
        productId: string;
        startDate?: string;
        endDate?: string;
      };

      if (!query.productId) {
        throw new BadRequestError('Product ID is required');
      }

      const product = await prisma.product.findUnique({
        where: { id: query.productId },
      });

      if (!product) {
        throw new BadRequestError('Product not found');
      }

      const where = {
        item: {
          session: {
            productId: query.productId,
          },
        },
        ...(query.startDate || query.endDate
          ? {
              createdAt: {
                ...(query.startDate && { gte: new Date(query.startDate) }),
                ...(query.endDate && { lte: new Date(query.endDate) }),
              },
            }
          : {}),
      };

      const defects = await prisma.defect.findMany({
        where,
        select: {
          positionX: true,
          positionY: true,
          defectTypeId: true,
        },
      });

      // Aggregate defects into heatmap data points
      const gridSize = 20; // 20x20 grid for aggregation
      const heatmapGrid: Map<string, { x: number; y: number; count: number; defectTypes: Set<string> }> = new Map();

      for (const defect of defects) {
        const gridX = Math.floor(defect.positionX * gridSize) / gridSize;
        const gridY = Math.floor(defect.positionY * gridSize) / gridSize;
        const key = `${gridX}-${gridY}`;

        if (heatmapGrid.has(key)) {
          const point = heatmapGrid.get(key)!;
          point.count++;
          point.defectTypes.add(defect.defectTypeId);
        } else {
          heatmapGrid.set(key, {
            x: gridX + 1 / (gridSize * 2), // Center of cell
            y: gridY + 1 / (gridSize * 2),
            count: 1,
            defectTypes: new Set([defect.defectTypeId]),
          });
        }
      }

      const maxCount = Math.max(...Array.from(heatmapGrid.values()).map((p) => p.count), 1);

      const dataPoints = Array.from(heatmapGrid.values()).map((point) => ({
        x: point.x,
        y: point.y,
        intensity: point.count / maxCount,
        count: point.count,
        defectTypeId: Array.from(point.defectTypes)[0], // Primary defect type
      }));

      return reply.send({
        success: true,
        data: {
          productId: product.id,
          templateImage: product.templateImage,
          templateWidth: product.templateWidth,
          templateHeight: product.templateHeight,
          dataPoints,
          totalDefects: defects.length,
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });

  // Get session statistics
  fastify.get('/sessions-stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const query = request.query as {
        productId?: string;
        startDate?: string;
        endDate?: string;
      };

      const where = {
        ...(query.productId && { productId: query.productId }),
        ...(query.startDate || query.endDate
          ? {
              startedAt: {
                ...(query.startDate && { gte: new Date(query.startDate) }),
                ...(query.endDate && { lte: new Date(query.endDate) }),
              },
            }
          : {}),
      };

      const [
        totalSessions,
        completedSessions,
        averageActiveTime,
      ] = await Promise.all([
        prisma.session.count({ where }),
        prisma.session.count({ where: { ...where, status: 'CLOSED' } }),
        prisma.session.aggregate({
          where: { ...where, status: 'CLOSED' },
          _avg: { activeTime: true },
        }),
      ]);

      // Daily session counts
      const sessions = await prisma.session.findMany({
        where,
        select: {
          startedAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { startedAt: 'asc' },
      });

      // Group by date
      const dailyStats: Record<string, { sessions: number; items: number }> = {};
      for (const session of sessions) {
        const date = session.startedAt.toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { sessions: 0, items: 0 };
        }
        dailyStats[date].sessions++;
        dailyStats[date].items += session._count.items;
      }

      return reply.send({
        success: true,
        data: {
          totalSessions,
          completedSessions,
          averageActiveTime: averageActiveTime._avg.activeTime || 0,
          dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
            date,
            ...stats,
          })),
        },
      });
    } catch (error) {
      return handleError(error, reply);
    }
  });
};

export default analyticsRoutes;
