import { z } from 'zod';
import { Role, SessionStatus, ItemStatus } from '../types/index.js';

// ============================================
// Auth Validators
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================
// User Validators
// ============================================

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.nativeEnum(Role).default(Role.INSPECTOR),
  defaultWorkstationId: z.string().optional().nullable(),
  workstationIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.nativeEnum(Role).optional(),
  defaultWorkstationId: z.string().optional().nullable(),
  workstationIds: z.array(z.string()).optional(),
});

// ============================================
// Workstation Validators
// ============================================

export const createWorkstationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateWorkstationSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================
// Product Validators
// ============================================

export const createProductSchema = z.object({
  code: z.string().min(1, 'Product code is required'),
  name: z.string().min(1, 'Name is required'),
  nameEn: z.string().optional().nullable(),
  templateImage: z.string().optional(),
  templateWidth: z.number().int().positive().default(800),
  templateHeight: z.number().int().positive().default(600),
  normPerHour: z.number().int().positive('Norm must be a positive integer'),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  code: z.string().min(1, 'Product code is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  nameEn: z.string().optional().nullable(),
  templateImage: z.string().optional(),
  templateWidth: z.number().int().positive().optional(),
  templateHeight: z.number().int().positive().optional(),
  normPerHour: z.number().int().positive('Norm must be a positive integer').optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// DefectType Validators
// ============================================

export const createDefectTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  nameEn: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  severity: z.number().int().min(1).max(5).default(1),
  isActive: z.boolean().default(true),
});

export const updateDefectTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  nameEn: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  severity: z.number().int().min(1).max(5).optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// Session Validators
// ============================================

export const createSessionSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  workstationId: z.string().min(1, 'Workstation ID is required'),
  batch: z.string().optional().nullable(),
  sapMaterial: z.string().optional().nullable(),
  sapBatch: z.string().optional().nullable(),
});

export const updateSessionSchema = z.object({
  status: z.nativeEnum(SessionStatus).optional(),
  batch: z.string().optional().nullable(),
  sapMaterial: z.string().optional().nullable(),
  sapBatch: z.string().optional().nullable(),
  activeTime: z.number().int().nonnegative().optional(),
});

// ============================================
// Item Validators
// ============================================

export const createItemSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  sequence: z.number().int().positive().optional(),
  status: z.nativeEnum(ItemStatus).default(ItemStatus.OK),
});

export const updateItemSchema = z.object({
  status: z.nativeEnum(ItemStatus).optional(),
});

// ============================================
// Defect Validators
// ============================================

export const createDefectSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  defectTypeId: z.string().min(1, 'Defect type ID is required'),
  positionX: z.number().min(0).max(1, 'Position X must be between 0 and 1'),
  positionY: z.number().min(0).max(1, 'Position Y must be between 0 and 1'),
  severity: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateDefectSchema = z.object({
  defectTypeId: z.string().optional(),
  positionX: z.number().min(0).max(1).optional(),
  positionY: z.number().min(0).max(1).optional(),
  severity: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ============================================
// Sync Validators
// ============================================

export const syncOperationSchema = z.object({
  id: z.string(),
  type: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  entityType: z.enum(['session', 'item', 'defect', 'defectPhoto']),
  entityId: z.string(),
  data: z.record(z.unknown()),
  timestamp: z.number(),
  synced: z.boolean(),
});

export const syncRequestSchema = z.object({
  operations: z.array(syncOperationSchema),
  lastSyncTimestamp: z.number(),
});

// ============================================
// Query Validators
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const sessionFiltersSchema = z.object({
  productId: z.string().optional(),
  workstationId: z.string().optional(),
  userId: z.string().optional(),
  status: z.nativeEnum(SessionStatus).optional(),
  batch: z.string().optional(),
  ...paginationSchema.shape,
  ...dateRangeSchema.shape,
});

export const heatmapQuerySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  defectTypeIds: z.array(z.string()).optional(),
});

// ============================================
// Type exports from validators
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateWorkstationInput = z.infer<typeof createWorkstationSchema>;
export type UpdateWorkstationInput = z.infer<typeof updateWorkstationSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateDefectTypeInput = z.infer<typeof createDefectTypeSchema>;
export type UpdateDefectTypeInput = z.infer<typeof updateDefectTypeSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type CreateDefectInput = z.infer<typeof createDefectSchema>;
export type UpdateDefectInput = z.infer<typeof updateDefectSchema>;
export type SyncOperationInput = z.infer<typeof syncOperationSchema>;
export type SyncRequestInput = z.infer<typeof syncRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SessionFiltersInput = z.infer<typeof sessionFiltersSchema>;
export type HeatmapQueryInput = z.infer<typeof heatmapQuerySchema>;
