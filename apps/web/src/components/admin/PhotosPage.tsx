import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Product, PaginatedResponse, DefectPhoto } from '@glass-inspector/shared';

interface PhotoWithDetails extends DefectPhoto {
  defectTypeName: string;
  defectTypeNameEn?: string;
  defectColor: string;
  productCode: string;
  productName: string;
  userName: string;
  sessionId: string;
}

export function PhotosPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithDetails | null>(null);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data || [];
    },
  });

  const { data: photosData, isLoading } = useQuery({
    queryKey: ['admin-photos', productFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productFilter) params.append('productId', productFilter);
      params.append('page', String(page));
      params.append('pageSize', '24');
      const response = await api.get<PaginatedResponse<PhotoWithDetails>>(`/photos?${params}`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/photos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      queryClient.invalidateQueries({ queryKey: ['recentPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setSelectedPhoto(null);
      toast({ title: t('common.success'), description: t('photos.deleted') });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('photos.deleteFailed'), variant: 'destructive' });
    },
  });

  const handleDelete = (photo: PhotoWithDetails) => {
    if (confirm(t('photos.deleteConfirm'))) {
      deleteMutation.mutate(photo.id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {t('photos.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={productFilter || 'all'} onValueChange={(v) => setProductFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('sessions.product')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code} - {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1 text-right text-sm text-muted-foreground">
            {photosData?.total ? t('photos.totalCount', { count: photosData.total }) : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : photosData?.data?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('photos.noPhotos')}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photosData?.data?.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.thumbnailPath}
                    alt="Defect photo"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div
                    className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: photo.defectColor }}
                    title={i18n.language === 'en' && photo.defectTypeNameEn ? photo.defectTypeNameEn : photo.defectTypeName}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(photo);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {photosData && photosData.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t('common.previous')}
                </Button>
                <span className="py-2 px-4 text-sm">
                  {page} / {photosData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === photosData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Fullscreen photo view */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhoto.originalPath}
              alt="Defect photo"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-sm">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedPhoto.defectColor }}
                  />
                  {i18n.language === 'en' && selectedPhoto.defectTypeNameEn
                    ? selectedPhoto.defectTypeNameEn
                    : selectedPhoto.defectTypeName}
                </span>
                <span>{selectedPhoto.productCode}</span>
                <span>{selectedPhoto.userName}</span>
                <span>{formatDateTime(selectedPhoto.createdAt, i18n.language === 'cs' ? 'cs-CZ' : 'en-US')}</span>
              </div>
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selectedPhoto)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setSelectedPhoto(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
