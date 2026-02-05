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
import { TemplateUpload } from './TemplateUpload';
import { api } from '@/lib/api';
import type { Product } from '@glass-inspector/shared';

interface ProductFormData {
  code: string;
  name: string;
  nameEn?: string;
  normPerHour: number;
  templateWidth: number;
  templateHeight: number;
}

export function ProductsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { register, handleSubmit, reset } = useForm<ProductFormData>();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return api.post('/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: t('common.success'), description: 'Product created' });
      closeDialog();
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to create product', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      return api.patch(`/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: t('common.success'), description: 'Product updated' });
      closeDialog();
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to update product', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: t('common.success'), description: 'Product deleted' });
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to delete product', variant: 'destructive' });
    },
  });

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      reset({
        code: product.code,
        name: product.name,
        nameEn: product.nameEn || '',
        normPerHour: product.normPerHour,
        templateWidth: product.templateWidth,
        templateHeight: product.templateHeight,
      });
    } else {
      setEditingProduct(null);
      reset({
        code: '',
        name: '',
        nameEn: '',
        normPerHour: 60,
        templateWidth: 800,
        templateHeight: 600,
      });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    reset();
  };

  const onSubmit = (data: ProductFormData) => {
    const formattedData = {
      ...data,
      normPerHour: Number(data.normPerHour),
      templateWidth: Number(data.templateWidth),
      templateHeight: Number(data.templateHeight),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formattedData });
    } else {
      createMutation.mutate(formattedData);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('products.title')}</CardTitle>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          {t('products.createProduct')}
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
                <TableHead>{t('products.code')}</TableHead>
                <TableHead>{t('products.name')}</TableHead>
                <TableHead>{t('products.normPerHour')}</TableHead>
                <TableHead>{t('products.template')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono font-medium">{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.normPerHour} ks/hod</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {product.templateImage ? (
                        <Badge variant="success">Uploaded</Badge>
                      ) : (
                        <Badge variant="secondary">No template</Badge>
                      )}
                      <TemplateUpload
                        product={product}
                        onUploaded={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Are you sure?')) deleteMutation.mutate(product.id);
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
              {editingProduct ? t('products.editProduct') : t('products.createProduct')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('products.code')}</Label>
              <Input {...register('code', { required: true })} placeholder="WS-001" />
            </div>
            <div className="space-y-2">
              <Label>{t('products.name')}</Label>
              <Input {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('products.nameEn')}</Label>
              <Input {...register('nameEn')} />
            </div>
            <div className="space-y-2">
              <Label>{t('products.normPerHour')}</Label>
              <Input
                type="number"
                {...register('normPerHour', { required: true, min: 1 })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Width (px)</Label>
                <Input
                  type="number"
                  {...register('templateWidth', { required: true, min: 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Template Height (px)</Label>
                <Input
                  type="number"
                  {...register('templateHeight', { required: true, min: 100 })}
                />
              </div>
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
