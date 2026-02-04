import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DefectType, Position } from '@glass-inspector/shared';

interface DefectTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  defectTypes: DefectType[];
  position: Position | null;
  onSelect: (defectType: DefectType, position: Position) => void;
}

export function DefectTypeSelector({
  isOpen,
  onClose,
  defectTypes,
  position,
  onSelect,
}: DefectTypeSelectorProps) {
  const { t, i18n } = useTranslation();

  const handleSelect = (defectType: DefectType) => {
    if (position) {
      onSelect(defectType, position);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('defects.selectDefectType')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto">
          {defectTypes.map((type) => (
            <Button
              key={type.id}
              variant="outline"
              className="h-14 justify-start text-left"
              onClick={() => handleSelect(type)}
            >
              <span
                className="w-5 h-5 rounded-full mr-3 flex-shrink-0"
                style={{ backgroundColor: type.color }}
              />
              <div className="flex-1">
                <div className="font-medium">
                  {i18n.language === 'en' && type.nameEn ? type.nameEn : type.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('defects.severity')}: {type.severity}/5
                </div>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
