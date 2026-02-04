import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { compressImage, getImagePreview } from '@/lib/imageCompression';
import { api } from '@/lib/api';
import { toast } from '@/components/ui/toaster';
import type { DefectPhoto } from '@glass-inspector/shared';

interface PhotoCaptureProps {
  defectId: string;
  onPhotoAdded: (photo: DefectPhoto) => void;
}

export function PhotoCapture({ defectId, onPhotoAdded }: PhotoCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const previewUrl = await getImagePreview(file);
    setPreview(previewUrl);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Compress image before upload
      const compressedFile = await compressImage(selectedFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
      });

      // Upload
      const response = await api.uploadFile<DefectPhoto>(
        `/photos/defects/${defectId}/photos`,
        compressedFile,
        'file'
      );

      if (response.success && response.data) {
        onPhotoAdded(response.data);
        toast({ title: t('common.success'), description: 'Photo uploaded' });
      }

      // Reset
      setPreview(null);
      setSelectedFile(null);
    } catch (error) {
      toast({ title: t('common.error'), description: 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div className="flex gap-2">
          {/* Camera button (for mobile) */}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            {t('defects.takePhoto')}
          </Button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Upload button */}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('defects.addPhoto')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/80"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
