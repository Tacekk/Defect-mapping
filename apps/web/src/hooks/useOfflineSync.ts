import { useEffect, useState, useCallback } from 'react';
import { db, SyncOperation } from '@/db';
import { api } from '@/lib/api';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Count pending operations
  useEffect(() => {
    const updateCount = async () => {
      const count = await db.syncQueue.count();
      setPendingCount(count);
    };
    updateCount();

    // Poll for updates
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Process sync queue when online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      processQueue();
    }
  }, [isOnline, pendingCount, isSyncing]);

  const processQueue = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const operations = await db.syncQueue.orderBy('timestamp').toArray();

      for (const op of operations) {
        try {
          await processOperation(op);
          await db.syncQueue.delete(op.id!);
        } catch (error) {
          // Update attempt count and error
          await db.syncQueue.update(op.id!, {
            attempts: op.attempts + 1,
            lastError: String(error),
          });

          // Skip if too many attempts
          if (op.attempts >= 5) {
            console.error('Operation failed too many times, skipping:', op);
            await db.syncQueue.delete(op.id!);
          }
        }
      }
    } finally {
      setIsSyncing(false);
      const count = await db.syncQueue.count();
      setPendingCount(count);
    }
  }, [isSyncing]);

  const addToQueue = useCallback(async (
    type: SyncOperation['type'],
    entityType: SyncOperation['entityType'],
    localId: string,
    data: Record<string, unknown>,
    serverId?: string
  ) => {
    await db.syncQueue.add({
      type,
      entityType,
      localId,
      serverId,
      data,
      timestamp: Date.now(),
      attempts: 0,
    });
    setPendingCount((c) => c + 1);

    // Try to sync immediately if online
    if (isOnline) {
      setTimeout(processQueue, 100);
    }
  }, [isOnline, processQueue]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addToQueue,
    processQueue,
  };
}

async function processOperation(op: SyncOperation): Promise<void> {
  switch (op.entityType) {
    case 'session':
      await processSessionOperation(op);
      break;
    case 'item':
      await processItemOperation(op);
      break;
    case 'defect':
      await processDefectOperation(op);
      break;
  }
}

async function processSessionOperation(op: SyncOperation): Promise<void> {
  switch (op.type) {
    case 'CREATE': {
      const response = await api.post('/sessions', op.data);
      if (response.success && response.data) {
        // Update local session with server ID
        const localSession = await db.sessions.get(op.localId);
        if (localSession) {
          await db.sessions.update(op.localId, {
            id: (response.data as any).id,
            syncStatus: 'synced',
          });
        }
      }
      break;
    }
    case 'UPDATE': {
      if (op.serverId) {
        await api.patch(`/sessions/${op.serverId}`, op.data);
      }
      break;
    }
    case 'DELETE': {
      if (op.serverId) {
        await api.delete(`/sessions/${op.serverId}`);
      }
      break;
    }
  }
}

async function processItemOperation(op: SyncOperation): Promise<void> {
  switch (op.type) {
    case 'CREATE': {
      const sessionId = op.data.sessionId as string;
      const response = await api.post(`/sessions/${sessionId}/items`, op.data);
      if (response.success && response.data) {
        const localItem = await db.items.get(op.localId);
        if (localItem) {
          await db.items.update(op.localId, {
            id: (response.data as any).id,
            syncStatus: 'synced',
          });
        }
      }
      break;
    }
    case 'UPDATE': {
      if (op.serverId) {
        await api.patch(`/sessions/items/${op.serverId}`, op.data);
      }
      break;
    }
  }
}

async function processDefectOperation(op: SyncOperation): Promise<void> {
  switch (op.type) {
    case 'CREATE': {
      const itemId = op.data.itemId as string;
      const response = await api.post(`/sessions/items/${itemId}/defects`, op.data);
      if (response.success && response.data) {
        const localDefect = await db.defects.get(op.localId);
        if (localDefect) {
          await db.defects.update(op.localId, {
            id: (response.data as any).id,
            syncStatus: 'synced',
          });
        }
      }
      break;
    }
    case 'DELETE': {
      if (op.serverId) {
        await api.delete(`/sessions/defects/${op.serverId}`);
      }
      break;
    }
  }
}
