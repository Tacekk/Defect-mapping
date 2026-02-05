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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import type { Workstation } from '@glass-inspector/shared';

interface WorkstationFormData {
  name: string;
  description?: string;
  isActive: boolean;
}

export function WorkstationsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkstation, setEditingWorkstation] = useState<Workstation | null>(null);

  const { register, handleSubmit, reset } = useForm<WorkstationFormData>();

  const { data: workstations, isLoading } = useQuery({
    queryKey: ['workstations'],
    queryFn: async () => {
      const response = await api.get<Workstation[]>('/workstations');
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WorkstationFormData) => {
      return api.post('/workstations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstations'] });
      toast({ title: t('common.success'), description: 'Workstation created' });
      closeDialog();
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to create workstation', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkstationFormData> }) => {
      return api.patch(`/workstations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstations'] });
      toast({ title: t('common.success'), description: 'Workstation updated' });
      closeDialog();
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to update workstation', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/workstations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workstations'] });
      toast({ title: t('common.success'), description: 'Workstation deleted' });
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to delete workstation', variant: 'destructive' });
    },
  });

  const openDialog = (workstation?: Workstation) => {
    if (workstation) {
      setEditingWorkstation(workstation);
      reset({
        name: workstation.name,
        description: workstation.description || '',
        isActive: workstation.isActive,
      });
    } else {
      setEditingWorkstation(null);
      reset({
        name: '',
        description: '',
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingWorkstation(null);
    reset();
  };

  const onSubmit = (data: WorkstationFormData) => {
    if (editingWorkstation) {
      updateMutation.mutate({ id: editingWorkstation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('workstations.title')}</CardTitle>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('workstations.createWorkstation')}
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
                <TableHead>{t('workstations.name')}</TableHead>
                <TableHead>{t('workstations.description')}</TableHead>
                <TableHead>{t('workstations.isActive')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workstations?.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell className="font-medium">{ws.name}</TableCell>
                  <TableCell>{ws.description || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={ws.isActive ? 'success' : 'secondary'}>
                      {ws.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(ws)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure?')) deleteMutation.mutate(ws.id);
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
              {editingWorkstation ? t('workstations.editWorkstation') : t('workstations.createWorkstation')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('workstations.name')}</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('workstations.description')}</Label>
              <Input {...register('description')} />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">{t('workstations.isActive')}</Label>
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
