import { WifiOff, Cloud, Loader2 } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null; // Don't show anything when fully synced
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium shadow-lg',
        isOnline
          ? 'bg-primary text-primary-foreground'
          : 'bg-destructive text-destructive-foreground'
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
          {pendingCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {pendingCount} pending
            </span>
          )}
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-4 w-4" />
          <span>{pendingCount} pending</span>
        </>
      ) : null}
    </div>
  );
}
