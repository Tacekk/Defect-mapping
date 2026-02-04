import Dexie, { Table } from 'dexie';
import type { Product, Workstation, DefectType, Session, Item, Defect } from '@glass-inspector/shared';

// Extend types with sync status
interface SyncableEntity {
  localId?: string;
  syncStatus: 'synced' | 'pending' | 'error';
  lastModified: number;
}

export interface LocalProduct extends Product, SyncableEntity {}
export interface LocalWorkstation extends Workstation, SyncableEntity {}
export interface LocalDefectType extends DefectType, SyncableEntity {}
export interface LocalSession extends Session, SyncableEntity {
  localId: string;
}
export interface LocalItem extends Item, SyncableEntity {
  localId: string;
  localSessionId: string;
}
export interface LocalDefect extends Defect, SyncableEntity {
  localId: string;
  localItemId: string;
}

export interface SyncOperation {
  id?: number;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'session' | 'item' | 'defect';
  localId: string;
  serverId?: string;
  data: Record<string, unknown>;
  timestamp: number;
  attempts: number;
  lastError?: string;
}

class GlassInspectorDB extends Dexie {
  products!: Table<LocalProduct, string>;
  workstations!: Table<LocalWorkstation, string>;
  defectTypes!: Table<LocalDefectType, string>;
  sessions!: Table<LocalSession, string>;
  items!: Table<LocalItem, string>;
  defects!: Table<LocalDefect, string>;
  syncQueue!: Table<SyncOperation, number>;

  constructor() {
    super('GlassInspectorDB');

    this.version(1).stores({
      products: 'id, code, syncStatus',
      workstations: 'id, syncStatus',
      defectTypes: 'id, syncStatus',
      sessions: 'localId, id, status, syncStatus, productId, workstationId',
      items: 'localId, id, localSessionId, sessionId, syncStatus',
      defects: 'localId, id, localItemId, itemId, syncStatus',
      syncQueue: '++id, entityType, localId, timestamp',
    });
  }
}

export const db = new GlassInspectorDB();

// Helper functions
export async function clearAllData(): Promise<void> {
  await db.products.clear();
  await db.workstations.clear();
  await db.defectTypes.clear();
  await db.sessions.clear();
  await db.items.clear();
  await db.defects.clear();
  await db.syncQueue.clear();
}

export async function cacheProducts(products: Product[]): Promise<void> {
  const localProducts: LocalProduct[] = products.map((p) => ({
    ...p,
    syncStatus: 'synced' as const,
    lastModified: Date.now(),
  }));
  await db.products.bulkPut(localProducts);
}

export async function cacheWorkstations(workstations: Workstation[]): Promise<void> {
  const localWorkstations: LocalWorkstation[] = workstations.map((w) => ({
    ...w,
    syncStatus: 'synced' as const,
    lastModified: Date.now(),
  }));
  await db.workstations.bulkPut(localWorkstations);
}

export async function cacheDefectTypes(defectTypes: DefectType[]): Promise<void> {
  const localDefectTypes: LocalDefectType[] = defectTypes.map((dt) => ({
    ...dt,
    syncStatus: 'synced' as const,
    lastModified: Date.now(),
  }));
  await db.defectTypes.bulkPut(localDefectTypes);
}

export function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
