// ============================================
// Enums
// ============================================

export enum Role {
  ADMIN = 'ADMIN',
  INSPECTOR = 'INSPECTOR',
  QUALITY = 'QUALITY',
}

export enum SessionStatus {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum ItemStatus {
  OK = 'OK',
  DEFECTIVE = 'DEFECTIVE',
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  defaultWorkstationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithWorkstations extends User {
  workstations: Workstation[];
  defaultWorkstation: Workstation | null;
}

// ============================================
// Workstation Types
// ============================================

export interface Workstation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

// ============================================
// Product Types
// ============================================

export interface Product {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  templateImage: string;
  templateWidth: number;
  templateHeight: number;
  normPerHour: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Defect Type Types
// ============================================

export interface DefectType {
  id: string;
  name: string;
  nameEn: string | null;
  color: string;
  severity: number;
  isActive: boolean;
  createdAt: Date;
}

// ============================================
// Session Types
// ============================================

export interface Session {
  id: string;
  productId: string;
  workstationId: string;
  userId: string;
  batch: string | null;
  sapMaterial: string | null;
  sapBatch: string | null;
  status: SessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  activeTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionWithRelations extends Session {
  product: Product;
  workstation: Workstation;
  user: Pick<User, 'id' | 'name' | 'email'>;
  items: ItemWithDefects[];
  _count?: {
    items: number;
  };
}

// ============================================
// Item Types
// ============================================

export interface Item {
  id: string;
  sessionId: string;
  sequence: number;
  status: ItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemWithDefects extends Item {
  defects: DefectWithType[];
}

// ============================================
// Defect Types
// ============================================

export interface Defect {
  id: string;
  itemId: string;
  defectTypeId: string;
  positionX: number;
  positionY: number;
  severity: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DefectWithType extends Defect {
  defectType: DefectType;
  photos: DefectPhoto[];
}

// ============================================
// Defect Photo Types
// ============================================

export interface DefectPhoto {
  id: string;
  defectId: string;
  originalPath: string;
  thumbnailPath: string;
  createdAt: Date;
}

// ============================================
// Audit Log Types
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AuditLogWithUser extends AuditLog {
  user: Pick<User, 'id' | 'name' | 'email'>;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// ============================================
// Analytics Types
// ============================================

export interface HeatmapDataPoint {
  x: number;
  y: number;
  intensity: number;
  defectTypeId: string;
}

export interface HeatmapResponse {
  productId: string;
  templateImage: string;
  templateWidth: number;
  templateHeight: number;
  dataPoints: HeatmapDataPoint[];
  totalDefects: number;
}

export interface KPIMetrics {
  totalItemsInspected: number;
  defectiveItems: number;
  defectRate: number;
  defectRateTrend: number;
  totalDefects: number;
  avgDefectsPerItem: number;
  topDefectTypes: {
    defectType: DefectType;
    count: number;
    percentage: number;
  }[];
}

// ============================================
// Sync Types (for offline support)
// ============================================

export interface SyncOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'session' | 'item' | 'defect' | 'defectPhoto';
  entityId: string;
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}

export interface SyncRequest {
  operations: SyncOperation[];
  lastSyncTimestamp: number;
}

export interface SyncResponse {
  success: boolean;
  processedOperations: string[];
  failedOperations: { id: string; error: string }[];
  serverTimestamp: number;
  updates: {
    sessions?: Session[];
    items?: Item[];
    defects?: Defect[];
  };
}

// ============================================
// Position Type (for defect canvas)
// ============================================

export interface Position {
  x: number;
  y: number;
}

export interface DefectMarker extends Position {
  id: string;
  defectTypeId: string;
  color: string;
}
