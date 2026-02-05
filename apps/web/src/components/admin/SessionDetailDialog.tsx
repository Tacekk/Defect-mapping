import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Package, Monitor, User, Calendar, BarChart3, Play, AlertTriangle, Camera, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import { formatDateTime, formatTime } from '@/lib/utils';
import { useInspectionStore } from '@/stores/inspectionStore';
import { useAuthStore } from '@/stores/authStore';
import type { SessionWithRelations, DefectType, DefectPhoto } from '@glass-inspector/shared';

interface SessionDetailDialogProps {
  session: SessionWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SessionDetailDialog({ session, isOpen, onClose }: SessionDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DefectPhoto | null>(null);
  
  // Callback ref to capture canvas when it mounts
  const canvasRef = (element: HTMLCanvasElement | null) => {
    setCanvasElement(element);
  };

  const currentUser = useAuthStore((state) => state.user);
  const {
    setCurrentSession,
    setCurrentItem,
    setCurrentItemIndex,
    setItems,
    setSelectedWorkstation,
    setSelectedProduct,
    startTimer,
    updateActiveTime,
    reset,
  } = useInspectionStore();

  // Fetch full session details
  const { data: sessionDetail } = useQuery({
    queryKey: ['session', session?.id],
    queryFn: async () => {
      if (!session?.id) return null;
      const response = await api.get<SessionWithRelations>(`/sessions/${session.id}`);
      return response.data;
    },
    enabled: !!session?.id && isOpen,
  });

  // Fetch defect types for colors
  const { data: defectTypes } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: async () => {
      const response = await api.get<DefectType[]>('/defect-types');
      return response.data || [];
    },
  });

  // Takeover mutation
  const takeoverMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.post<SessionWithRelations>(`/sessions/${sessionId}/takeover`, {});
      return response.data;
    },
    onSuccess: (takenSession) => {
      if (takenSession) {
        // Reset inspection store and load the session
        reset();
        setCurrentSession(takenSession as any);
        setSelectedProduct(takenSession.product);
        setSelectedWorkstation(takenSession.workstation);
        
        const items = takenSession.items || [];
        setItems(items as any[]);
        
        if (items.length > 0) {
          setCurrentItem(items[items.length - 1] as any);
          setCurrentItemIndex(items.length - 1);
        }
        
        // Restore active time from session before starting timer
        updateActiveTime(takenSession.activeTime || 0);
        startTimer();
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        toast({ title: t('common.success'), description: t('sessions.takeoverSuccess') });
        onClose();
        navigate('/inspection');
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error?.response?.data?.message || 'Failed to takeover session',
        variant: 'destructive',
      });
    },
  });

  // Draw heatmap on canvas
  useEffect(() => {
    if (!canvasElement || !sessionDetail || !isOpen) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions based on product template
    const product = sessionDetail.product;
    const aspectRatio = product.templateWidth / product.templateHeight;
    const maxWidth = 400;
    const width = maxWidth;
    const height = width / aspectRatio;
    
    // Set canvas size imperatively (don't use state - it would trigger re-render and clear the canvas)
    canvasElement.width = width;
    canvasElement.height = height;

    // Clear and fill background
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, 0, width, height);

    // Collect all defects from all items
    const allDefects: { x: number; y: number; defectTypeId: string }[] = [];
    sessionDetail.items?.forEach((item) => {
      item.defects?.forEach((defect) => {
        allDefects.push({
          x: defect.positionX,
          y: defect.positionY,
          defectTypeId: defect.defectTypeId,
        });
      });
    });

    // Draw defects as heatmap points
    allDefects.forEach((defect) => {
      const x = defect.x * width;
      const y = defect.y * height;
      const radius = 20;

      const defectType = defectTypes?.find((dt) => dt.id === defect.defectTypeId);
      const color = defectType?.color || '#EF4444';

      // Draw glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color + '99');
      gradient.addColorStop(1, color + '00');
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw center point
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [canvasElement, sessionDetail, defectTypes, isOpen]);

  if (!session) return null;

  const detail = sessionDetail || session;
  const totalItems = detail.items?.length || detail._count?.items || 0;
  const defectiveItems = detail.items?.filter((i) => i.status === 'DEFECTIVE').length || 0;
  const totalDefects = detail.items?.reduce((sum, item) => sum + (item.defects?.length || 0), 0) || 0;
  const defectRate = totalItems > 0 ? (defectiveItems / totalItems) * 100 : 0;
  const isOwnSession = currentUser?.id === detail.userId;
  const canTakeover = detail.status !== 'CLOSED' && !isOwnSession;
  
  // Collect all photos from all defects
  const allPhotos: (DefectPhoto & { defectTypeName?: string; defectColor?: string })[] = [];
  detail.items?.forEach((item) => {
    item.defects?.forEach((defect) => {
      defect.photos?.forEach((photo) => {
        allPhotos.push({
          ...photo,
          defectTypeName: defect.defectType?.name,
          defectColor: defect.defectType?.color,
        });
      });
    });
  });

  const handleTakeover = () => {
    if (confirm(t('sessions.takeoverConfirm'))) {
      takeoverMutation.mutate(session.id);
    }
  };

  const handleJumpToSession = () => {
    if (isOwnSession && detail.status !== 'CLOSED') {
      // Load own session
      reset();
      setCurrentSession(detail as any);
      setSelectedProduct(detail.product);
      setSelectedWorkstation(detail.workstation);
      
      const items = detail.items || [];
      setItems(items as any[]);
      
      if (items.length > 0) {
        setCurrentItem(items[items.length - 1] as any);
        setCurrentItemIndex(items.length - 1);
      }
      
      // Restore active time from session before starting timer
      updateActiveTime(detail.activeTime || 0);
      startTimer();
      onClose();
      navigate('/inspection');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {detail.product?.code} - {detail.product?.name}
            <Badge
              variant={
                detail.status === 'OPEN' ? 'default' :
                detail.status === 'PAUSED' ? 'warning' : 'secondary'
              }
            >
              {t(`sessions.statuses.${detail.status}`)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {t('sessions.detailDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Left column - Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('sessions.workstation')}:</span>
              <span className="font-medium">{detail.workstation?.name}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('sessions.user')}:</span>
              <span className="font-medium">{detail.user?.name}</span>
              {isOwnSession && <Badge variant="outline" className="text-xs">You</Badge>}
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('sessions.startedAt')}:</span>
              <span className="font-medium">
                {formatDateTime(detail.startedAt, i18n.language === 'cs' ? 'cs-CZ' : 'en-US')}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('inspection.activeTime')}:</span>
              <span className="font-medium font-mono">{formatTime(detail.activeTime)}</span>
            </div>

            <div className="border-t pt-3 mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('sessions.itemsCount')}:</span>
                <span className="font-bold text-lg">{totalItems}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">{t('board.metrics.defectiveItems')}:</span>
                <span className="font-bold text-lg text-destructive">{defectiveItems}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t('board.metrics.defectRate')}:</span>
                <span className="font-bold text-lg">{defectRate.toFixed(1)}%</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground ml-6">{t('board.metrics.totalDefects') || 'Total defects'}:</span>
                <span className="font-bold">{totalDefects}</span>
              </div>
            </div>
          </div>

          {/* Right column - Heatmap */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('board.heatmap')}</p>
            <div className="bg-muted rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ aspectRatio: '5/3' }}
              />
            </div>
            {totalDefects === 0 ? (
              <p className="text-xs text-muted-foreground text-center">
                {t('inspection.noDefects')}
              </p>
            ) : (
              /* Defect types legend */
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {(() => {
                  // Collect unique defect types from session
                  const defectTypeCounts = new Map<string, { type: DefectType; count: number }>();
                  detail.items?.forEach((item) => {
                    item.defects?.forEach((defect) => {
                      const typeId = defect.defectTypeId;
                      const existing = defectTypeCounts.get(typeId);
                      if (existing) {
                        existing.count++;
                      } else {
                        const dt = defectTypes?.find((t) => t.id === typeId);
                        if (dt) {
                          defectTypeCounts.set(typeId, { type: dt, count: 1 });
                        }
                      }
                    });
                  });
                  return Array.from(defectTypeCounts.values())
                    .sort((a, b) => b.count - a.count)
                    .map(({ type, count }) => (
                      <div key={type.id} className="flex items-center gap-1 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: type.color }}
                        />
                        <span className="text-muted-foreground truncate max-w-[100px]" title={i18n.language === 'en' && type.nameEn ? type.nameEn : type.name}>
                          {i18n.language === 'en' && type.nameEn ? type.nameEn : type.name}
                        </span>
                        <span className="text-muted-foreground">({count})</span>
                      </div>
                    ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Photos section */}
        {allPhotos.length > 0 && (
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{t('defects.photos')} ({allPhotos.length})</p>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {allPhotos.slice(0, 12).map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.thumbnailPath}
                    alt="Defect photo"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {photo.defectColor && (
                    <div
                      className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/50"
                      style={{ backgroundColor: photo.defectColor }}
                      title={photo.defectTypeName}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
              {allPhotos.length > 12 && (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                  +{allPhotos.length - 12}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fullscreen photo view */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setSelectedPhoto(null)}
          >
            <img
              src={selectedPhoto.originalPath}
              alt="Defect photo"
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isOwnSession && detail.status !== 'CLOSED' && (
            <Button onClick={handleJumpToSession} className="w-full sm:w-auto">
              <Play className="h-4 w-4 mr-2" />
              {t('sessions.continueSession')}
            </Button>
          )}
          
          {canTakeover && (
            <Button
              onClick={handleTakeover}
              variant="destructive"
              disabled={takeoverMutation.isPending}
              className="w-full sm:w-auto"
            >
              <User className="h-4 w-4 mr-2" />
              {takeoverMutation.isPending ? t('common.loading') : t('sessions.takeover')}
            </Button>
          )}
          
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
