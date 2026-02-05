import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import { compressImage, getImagePreview } from '@/lib/imageCompression';
import type { Product } from '@glass-inspector/shared';

interface TemplateUploadProps {
  product: Product;
  onUploaded: (product: Product) => void;
}

export function TemplateUpload({ product, onUploaded }: TemplateUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = await getImagePreview(file);
    setPreview(previewUrl);
    setSelectedFile(file);
    setIsOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const compressedFile = await compressImage(selectedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
      });

      const response = await api.uploadFile<Product>(
        `/templates/products/${product.id}/template`,
        compressedFile,
        'file'
      );

      if (response.success && response.data) {
        onUploaded(response.data);
        toast({ title: t('common.success'), description: 'Template uploaded' });
        handleClose();
      }
    } catch (error) {
      toast({ title: t('common.error'), description: 'Failed to upload template', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
      >
        {product.templateImage ? (
          <>
            <ImageIcon className="h-4 w-4 mr-2" />
            Change
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {t('products.uploadTemplate')}
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('products.uploadTemplate')}</DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={preview}
                alt="Template preview"
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This image will be used as the template for defect mapping. 
            Recommended size: 1200x800px or similar aspect ratio.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
