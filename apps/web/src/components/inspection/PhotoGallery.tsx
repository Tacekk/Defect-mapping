import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, ZoomIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import type { DefectPhoto } from '@glass-inspector/shared';

interface PhotoGalleryProps {
  photos: DefectPhoto[];
  onPhotoDeleted?: (photoId: string) => void;
  readonly?: boolean;
}

export function PhotoGallery({ photos, onPhotoDeleted, readonly = false }: PhotoGalleryProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<DefectPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (photo: DefectPhoto, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(t('common.confirm') + '?')) return;

    setIsDeleting(photo.id);
    try {
      await api.delete(`/photos/${photo.id}`);
      onPhotoDeleted?.(photo.id);
      // Invalidate photo-related caches
      queryClient.invalidateQueries({ queryKey: ['recentPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      toast({ title: t('common.success'), description: 'Photo deleted' });
    } catch (error) {
      toast({ title: t('common.error'), description: 'Failed to delete photo', variant: 'destructive' });
    } finally {
      setIsDeleting(null);
    }
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
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
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
                <ZoomIn className="h-4 w-4" />
              </Button>
              {!readonly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white"
                  onClick={(e) => handleDelete(photo, e)}
                  disabled={isDeleting === photo.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen view */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0">
          <div className="relative w-full h-[80vh]">
            {selectedPhoto && (
              <img
                src={selectedPhoto.originalPath}
                alt="Defect photo"
                className="w-full h-full object-contain"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
