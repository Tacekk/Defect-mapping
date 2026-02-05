import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhotoCapture } from './PhotoCapture';
import { PhotoGallery } from './PhotoGallery';
import type { DefectWithType, DefectType, DefectPhoto } from '@glass-inspector/shared';

interface DefectDetailProps {
  defect: DefectWithType | null;
  defectTypes: DefectType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (defectId: string, data: { defectTypeId?: string; severity?: number; notes?: string }) => void;
  onDelete: (defectId: string) => void;
  onPhotoChange?: (defectId: string, photos: DefectPhoto[]) => void;
}

export function DefectDetail({
  defect,
  defectTypes,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onPhotoChange,
}: DefectDetailProps) {
  const { t, i18n } = useTranslation();
  const [notes, setNotes] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [severity, setSeverity] = useState(1);
  const [photos, setPhotos] = useState<DefectPhoto[]>([]);

  useEffect(() => {
    if (defect) {
      setNotes(defect.notes || '');
      setSelectedTypeId(defect.defectTypeId);
      setSeverity(defect.severity || defect.defectType.severity || 1);
      setPhotos(defect.photos || []);
    }
  }, [defect]);

  if (!defect) return null;

  const handleSave = () => {
    onUpdate(defect.id, {
      defectTypeId: selectedTypeId !== defect.defectTypeId ? selectedTypeId : undefined,
      severity: severity !== defect.severity ? severity : undefined,
      notes: notes !== defect.notes ? notes : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(defect.id);
  };

  const handlePhotoAdded = (photo: DefectPhoto) => {
    const newPhotos = [...photos, photo];
    setPhotos(newPhotos);
    if (defect && onPhotoChange) {
      onPhotoChange(defect.id, newPhotos);
    }
  };

  const handlePhotoDeleted = (photoId: string) => {
    const newPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(newPhotos);
    if (defect && onPhotoChange) {
      onPhotoChange(defect.id, newPhotos);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: defect.defectType.color }}
            />
            {i18n.language === 'en' && defect.defectType.nameEn
              ? defect.defectType.nameEn
              : defect.defectType.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('defects.type')}</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {defectTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {i18n.language === 'en' && type.nameEn ? type.nameEn : type.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('defects.severity')}</Label>
            <Select value={String(severity)} onValueChange={(v) => setSeverity(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} - {s === 1 ? 'Minor' : s === 5 ? 'Critical' : `Level ${s}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('defects.notes')}</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>

          <div className="space-y-2">
            <Label>{t('defects.position')}</Label>
            <div className="text-sm text-muted-foreground">
              X: {(defect.positionX * 100).toFixed(1)}% | Y: {(defect.positionY * 100).toFixed(1)}%
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('defects.photos')} ({photos.length})</Label>
            <PhotoGallery
              photos={photos}
              onPhotoDeleted={handlePhotoDeleted}
            />
            <PhotoCapture
              defectId={defect.id}
              onPhotoAdded={handlePhotoAdded}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave}>
              {t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
