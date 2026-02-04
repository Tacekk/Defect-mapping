import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DefectHeatmap } from '@/components/board/DefectHeatmap';
import { DefectParetoChart } from '@/components/board/DefectParetoChart';
import { api } from '@/lib/api';
import { formatPercentage } from '@/lib/utils';
import type { Product, DefectType, KPIMetrics, HeatmapResponse } from '@glass-inspector/shared';

export function BoardPage() {
  const { t, i18n } = useTranslation();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30days');

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data || [];
    },
  });

  // Fetch defect types
  const { data: defectTypes } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: async () => {
      const response = await api.get<DefectType[]>('/defect-types');
      return response.data || [];
    },
  });

  // Fetch KPI metrics
  const { data: kpiData, isLoading: isLoadingKpi } = useQuery({
    queryKey: ['kpi', selectedProductId, selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProductId) params.append('productId', selectedProductId);
      params.append('period', selectedPeriod);
      const response = await api.get<KPIMetrics>(`/analytics/kpi?${params}`);
      return response.data;
    },
  });

  // Fetch heatmap data
  const { data: heatmapData, isLoading: isLoadingHeatmap } = useQuery({
    queryKey: ['heatmap', selectedProductId, selectedPeriod],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const params = new URLSearchParams();
      params.append('productId', selectedProductId);
      // Add date range based on period
      const now = new Date();
      let startDate: Date | null = null;
      switch (selectedPeriod) {
        case '7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case '30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          break;
        case '90days':
          startDate = new Date(now.setDate(now.getDate() - 90));
          break;
      }
      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      const response = await api.get<HeatmapResponse>(`/analytics/heatmap?${params}`);
      return response.data;
    },
    enabled: !!selectedProductId,
  });

  const TrendIcon = ({ trend }: { trend: number }) => {
    if (trend > 0.01) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend < -0.01) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t('board.title')}</h1>

        <div className="flex flex-wrap gap-4">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('board.selectProduct')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All products</SelectItem>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code} - {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('board.selectPeriod')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">{t('board.periods.7days')}</SelectItem>
              <SelectItem value="30days">{t('board.periods.30days')}</SelectItem>
              <SelectItem value="90days">{t('board.periods.90days')}</SelectItem>
              <SelectItem value="all">{t('board.periods.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('board.metrics.totalInspected')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData?.totalItemsInspected?.toLocaleString(i18n.language) || '0'}
            </div>
            <p className="text-xs text-muted-foreground">items inspected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('board.metrics.defectiveItems')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData?.defectiveItems?.toLocaleString(i18n.language) || '0'}
            </div>
            <p className="text-xs text-muted-foreground">defective items found</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('board.metrics.defectRate')}
            </CardTitle>
            {kpiData && <TrendIcon trend={kpiData.defectRateTrend} />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData ? formatPercentage(kpiData.defectRate) : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpiData && kpiData.defectRateTrend !== 0 && (
                <span className={kpiData.defectRateTrend > 0 ? 'text-destructive' : 'text-success'}>
                  {kpiData.defectRateTrend > 0 ? '+' : ''}
                  {formatPercentage(kpiData.defectRateTrend)} vs previous
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Defects</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData?.totalDefects?.toLocaleString(i18n.language) || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {kpiData?.avgDefectsPerItem?.toFixed(2) || '0'} avg per defective item
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap and Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('board.heatmap')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedProductId ? (
              <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
                <p className="text-muted-foreground">Select a product to view heatmap</p>
              </div>
            ) : (
              <DefectHeatmap
                data={heatmapData || null}
                defectTypes={defectTypes || []}
                isLoading={isLoadingHeatmap}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('board.topDefects')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DefectParetoChart data={kpiData?.topDefectTypes} />
          </CardContent>
        </Card>
      </div>

      {/* Top Defects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Defect Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpiData?.topDefectTypes?.map((item, index) => (
              <div key={item.defectType?.id || index} className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 text-center font-bold text-muted-foreground">
                  #{index + 1}
                </div>
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.defectType?.color || '#6B7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {i18n.language === 'en' && item.defectType?.nameEn
                      ? item.defectType.nameEn
                      : item.defectType?.name || 'Unknown'}
                  </p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${item.percentage * 100}%`,
                        backgroundColor: item.defectType?.color || '#6B7280',
                      }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold">{item.count}</span>
                  <span className="text-muted-foreground ml-2">
                    ({formatPercentage(item.percentage)})
                  </span>
                </div>
              </div>
            ))}
            {(!kpiData?.topDefectTypes || kpiData.topDefectTypes.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No defect data available for the selected period.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
