import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Plus, ChevronRight, ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { DefectCanvas } from '@/components/inspection/DefectCanvas';
import { DefectTypeSelector } from '@/components/inspection/DefectTypeSelector';
import { useInspectionStore } from '@/stores/inspectionStore';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import type { Product, Workstation, DefectType, Session, Item, DefectMarker, Position, DefectWithType } from '@glass-inspector/shared';

export function InspectionPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    currentSession,
    currentItem,
    currentItemIndex,
    items,
    selectedWorkstation,
    selectedProduct,
    defectTypes,
    isTimerRunning,
    activeTime,
    setCurrentSession,
    setCurrentItem,
    setCurrentItemIndex,
    setItems,
    addItem,
    updateItem,
    setSelectedWorkstation,
    setSelectedProduct,
    setDefectTypes,
    startTimer,
    stopTimer,
    updateActiveTime,
    reset,
  } = useInspectionStore();

  const [batch, setBatch] = useState('');
  const [sapMaterial, setSapMaterial] = useState('');
  const [isDefectSelectorOpen, setIsDefectSelectorOpen] = useState(false);
  const [pendingDefectPosition, setPendingDefectPosition] = useState<Position | null>(null);
  const [currentDefects, setCurrentDefects] = useState<DefectMarker[]>([]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      interval = setInterval(() => {
        updateActiveTime(activeTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, activeTime, updateActiveTime]);

  // Visibility API for pausing timer
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTimerRunning) {
        stopTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isTimerRunning, stopTimer]);

  // Fetch workstations
  const { data: workstations } = useQuery({
    queryKey: ['workstations'],
    queryFn: async () => {
      const response = await api.get<Workstation[]>('/workstations');
      return response.data || [];
    },
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data || [];
    },
  });

  // Fetch defect types
  const { data: defectTypesData } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: async () => {
      const response = await api.get<DefectType[]>('/defect-types');
      return response.data || [];
    },
  });

  useEffect(() => {
    if (defectTypesData) {
      setDefectTypes(defectTypesData);
    }
  }, [defectTypesData, setDefectTypes]);

  // Update current defects when item changes
  useEffect(() => {
    if (currentItem && (currentItem as any).defects) {
      const defects: DefectMarker[] = (currentItem as any).defects.map((d: DefectWithType) => ({
        id: d.id,
        x: d.positionX,
        y: d.positionY,
        defectTypeId: d.defectTypeId,
        color: d.defectType.color,
      }));
      setCurrentDefects(defects);
    } else {
      setCurrentDefects([]);
    }
  }, [currentItem]);

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<Session>('/sessions', {
        productId: selectedProduct?.id,
        workstationId: selectedWorkstation?.id,
        batch: batch || null,
        sapMaterial: sapMaterial || null,
      });
      return response.data;
    },
    onSuccess: (session) => {
      if (session) {
        setCurrentSession(session);
        startTimer();
        // Automatically create first item
        addItemMutation.mutate();
        toast({ title: t('common.success'), description: t('inspection.startSession') });
      }
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to start session', variant: 'destructive' });
    },
  });

  // End session mutation
  const endSessionMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) return;
      return api.patch<Session>(`/sessions/${currentSession.id}`, {
        status: 'CLOSED',
        activeTime,
      });
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: t('common.success'), description: t('inspection.endSession') });
    },
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) return;
      const response = await api.post<Item>(`/sessions/${currentSession.id}/items`, {});
      return response.data;
    },
    onSuccess: (item) => {
      if (item) {
        addItem(item);
        setCurrentItem(item);
        setCurrentItemIndex(items.length);
        setCurrentDefects([]);
      }
    },
  });

  // Add defect mutation
  const addDefectMutation = useMutation({
    mutationFn: async ({ itemId, defectTypeId, position }: { itemId: string; defectTypeId: string; position: Position }) => {
      const response = await api.post<DefectWithType>(`/sessions/items/${itemId}/defects`, {
        defectTypeId,
        positionX: position.x,
        positionY: position.y,
      });
      return response.data;
    },
    onSuccess: (defect) => {
      if (defect && currentItem) {
        // Update current item with new defect
        const updatedItem = {
          ...currentItem,
          status: 'DEFECTIVE' as const,
          defects: [...((currentItem as any).defects || []), defect],
        };
        updateItem(updatedItem);
        setCurrentDefects([
          ...currentDefects,
          {
            id: defect.id,
            x: defect.positionX,
            y: defect.positionY,
            defectTypeId: defect.defectTypeId,
            color: defect.defectType.color,
          },
        ]);
      }
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to add defect', variant: 'destructive' });
    },
  });

  // Delete defect mutation
  const deleteDefectMutation = useMutation({
    mutationFn: async (defectId: string) => {
      return api.delete(`/sessions/defects/${defectId}`);
    },
    onSuccess: (_, defectId) => {
      setCurrentDefects(currentDefects.filter((d) => d.id !== defectId));
      if (currentItem) {
        const updatedDefects = ((currentItem as any).defects || []).filter((d: any) => d.id !== defectId);
        const updatedItem = {
          ...currentItem,
          status: updatedDefects.length === 0 ? 'OK' : 'DEFECTIVE',
          defects: updatedDefects,
        };
        updateItem(updatedItem);
      }
    },
  });

  const handleDefectAdd = useCallback((position: Position) => {
    setPendingDefectPosition(position);
    setIsDefectSelectorOpen(true);
  }, []);

  const handleDefectTypeSelect = useCallback((defectType: DefectType, position: Position) => {
    if (currentItem) {
      addDefectMutation.mutate({
        itemId: currentItem.id,
        defectTypeId: defectType.id,
        position,
      });
    }
    setPendingDefectPosition(null);
  }, [currentItem, addDefectMutation]);

  const handleDefectClick = useCallback((defect: DefectMarker) => {
    if (confirm('Delete this defect?')) {
      deleteDefectMutation.mutate(defect.id);
    }
  }, [deleteDefectMutation]);

  const handleStartSession = () => {
    if (!selectedProduct || !selectedWorkstation) {
      toast({ title: t('common.error'), description: 'Please select product and workstation', variant: 'destructive' });
      return;
    }
    startSessionMutation.mutate();
  };

  const handleNextItem = () => {
    if (currentItemIndex < items.length - 1) {
      const nextIndex = currentItemIndex + 1;
      setCurrentItemIndex(nextIndex);
      setCurrentItem(items[nextIndex]);
    } else {
      addItemMutation.mutate();
    }
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0) {
      const prevIndex = currentItemIndex - 1;
      setCurrentItemIndex(prevIndex);
      setCurrentItem(items[prevIndex]);
    }
  };

  // Calculate statistics
  const totalItems = items.length;
  const defectiveItems = items.filter((i) => i.status === 'DEFECTIVE').length;
  const okItems = totalItems - defectiveItems;

  if (!currentSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">{t('inspection.title')}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t('inspection.startSession')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('inspection.selectWorkstation')}</Label>
              <Select
                value={selectedWorkstation?.id || ''}
                onValueChange={(value) => {
                  const ws = workstations?.find((w) => w.id === value);
                  setSelectedWorkstation(ws || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inspection.selectWorkstation')} />
                </SelectTrigger>
                <SelectContent>
                  {workstations?.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('inspection.selectProduct')}</Label>
              <Select
                value={selectedProduct?.id || ''}
                onValueChange={(value) => {
                  const product = products?.find((p) => p.id === value);
                  setSelectedProduct(product || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('inspection.selectProduct')} />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inspection.batch')}</Label>
                <Input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Batch / Galia" />
              </div>
              <div className="space-y-2">
                <Label>{t('inspection.sapMaterial')}</Label>
                <Input value={sapMaterial} onChange={(e) => setSapMaterial(e.target.value)} placeholder="SAP Material" />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleStartSession}
              disabled={!selectedProduct || !selectedWorkstation || startSessionMutation.isPending}
            >
              <Play className="mr-2 h-5 w-5" />
              {t('inspection.startSession')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">{selectedProduct?.code}</h1>
          <Badge variant="outline">{selectedWorkstation?.name}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">{t('inspection.activeTime')}:</span>{' '}
            <span className="font-mono font-bold text-lg">{formatTime(activeTime)}</span>
          </div>
          <div className="flex gap-2">
            {isTimerRunning ? (
              <Button variant="outline" size="sm" onClick={stopTimer}>
                <Pause className="h-4 w-4 mr-1" />
                {t('inspection.pauseSession')}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={startTimer}>
                <Play className="h-4 w-4 mr-1" />
                {t('inspection.resumeSession')}
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={() => endSessionMutation.mutate()}>
              <Square className="h-4 w-4 mr-1" />
              {t('inspection.endSession')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-280px)] min-h-[400px]">
            <CardContent className="p-2 h-full">
              {selectedProduct && (
                <DefectCanvas
                  product={selectedProduct}
                  defects={currentDefects}
                  defectTypes={defectTypes}
                  onDefectAdd={handleDefectAdd}
                  onDefectClick={handleDefectClick}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Item navigation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                {t('inspection.currentItem')}
                {currentItem && (
                  <Badge variant={currentItem.status === 'OK' ? 'success' : 'destructive'}>
                    {currentItem.status === 'OK' ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                    {t(`inspection.item${currentItem.status === 'OK' ? 'Ok' : 'Defective'}`)}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="icon" onClick={handlePreviousItem} disabled={currentItemIndex === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-3xl font-bold">{totalItems > 0 ? currentItemIndex + 1 : 0}</span>
                <Button variant="outline" size="icon" onClick={handleNextItem}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button className="w-full" size="lg" onClick={handleNextItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('inspection.nextItem')}
              </Button>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold">{totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" /> OK:
                </span>
                <span className="font-bold text-success">{okItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" /> Defective:
                </span>
                <span className="font-bold text-destructive">{defectiveItems}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Defect Rate:</span>
                  <span className="font-bold">
                    {totalItems > 0 ? ((defectiveItems / totalItems) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current defects */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {t('defects.title')} ({currentDefects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentDefects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('inspection.noDefects')}
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {currentDefects.map((defect) => {
                    const type = defectTypes.find((t) => t.id === defect.defectTypeId);
                    return (
                      <div
                        key={defect.id}
                        className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent"
                        onClick={() => handleDefectClick(defect)}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: defect.color }} />
                        <span className="flex-1 text-sm truncate">{type?.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Defect Type Selector Dialog */}
      <DefectTypeSelector
        isOpen={isDefectSelectorOpen}
        onClose={() => {
          setIsDefectSelectorOpen(false);
          setPendingDefectPosition(null);
        }}
        defectTypes={defectTypes}
        position={pendingDefectPosition}
        onSelect={handleDefectTypeSelect}
      />
    </div>
  );
}
