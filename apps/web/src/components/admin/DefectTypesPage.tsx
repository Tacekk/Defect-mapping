import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import type { DefectType } from '@glass-inspector/shared';

interface DefectTypeFormData {
  name: string;
  nameEn?: string;
  color: string;
  severity: number;
}

const SEVERITY_OPTIONS = [
  { value: 1, label: '1 - Minor' },
  { value: 2, label: '2 - Low' },
  { value: 3, label: '3 - Medium' },
  { value: 4, label: '4 - High' },
  { value: 5, label: '5 - Critical' },
];

export function DefectTypesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDefectType, setEditingDefectType] = useState<DefectType | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<DefectTypeFormData>();
  const selectedSeverity = watch('severity');

  const { data: defectTypes, isLoading } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: async () => {
      const response = await api.get<DefectType[]>('/defect-types');
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: DefectTypeFormData) => {
      return api.post('/defect-types', { ...data, severity: Number(data.severity) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defectTypes'] });
      toast({ title: t('common.success'), description: 'Defect type created' });
      closeDialog();
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to create defect type', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DefectTypeFormData> }) => {
      return api.patch(`/defect-types/${id}`, { ...data, severity: Number(data.severity) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defectTypes'] });
      toast({ title: t('common.success'), description: 'Defect type updated' });
      closeDialog();
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to update defect type', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/defect-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defectTypes'] });
      toast({ title: t('common.success'), description: 'Defect type deleted' });
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to delete defect type', variant: 'destructive' });
    },
  });

  const openDialog = (defectType?: DefectType) => {
    if (defectType) {
      setEditingDefectType(defectType);
      reset({
        name: defectType.name,
        nameEn: defectType.nameEn || '',
        color: defectType.color,
        severity: defectType.severity,
      });
    } else {
      setEditingDefectType(null);
      reset({
        name: '',
        nameEn: '',
        color: '#EF4444',
        severity: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingDefectType(null);
    reset();
  };

  const onSubmit = (data: DefectTypeFormData) => {
    if (editingDefectType) {
      updateMutation.mutate({ id: editingDefectType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('defectTypes.title')}</CardTitle>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('defectTypes.createDefectType')}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('defectTypes.color')}</TableHead>
                <TableHead>{t('defectTypes.name')}</TableHead>
                <TableHead>{t('defectTypes.nameEn')}</TableHead>
                <TableHead>{t('defectTypes.severity')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {defectTypes?.map((dt) => (
                <TableRow key={dt.id}>
                  <TableCell>
                    <div
                      className="w-6 h-6 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: dt.color }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{dt.name}</TableCell>
                  <TableCell>{dt.nameEn || '-'}</TableCell>
                  <TableCell>
                    {SEVERITY_OPTIONS.find((s) => s.value === dt.severity)?.label || dt.severity}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(dt)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure?')) deleteMutation.mutate(dt.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDefectType ? t('defectTypes.editDefectType') : t('defectTypes.createDefectType')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('defectTypes.name')}</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('defectTypes.nameEn')}</Label>
              <Input {...register('nameEn')} />
            </div>
            <div className="space-y-2">
              <Label>{t('defectTypes.color')}</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  {...register('color', { required: true })}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <Input
                  {...register('color', { required: true })}
                  placeholder="#EF4444"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('defectTypes.severity')}</Label>
              <Select
                value={String(selectedSeverity || 1)}
                onValueChange={(value) => setValue('severity', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
