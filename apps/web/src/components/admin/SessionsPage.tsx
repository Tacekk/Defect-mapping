import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { Session, Product, Workstation, PaginatedResponse } from '@glass-inspector/shared';

export function SessionsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [productFilter, setProductFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      return response.data || [];
    },
  });

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions', productFilter, statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productFilter) params.append('productId', productFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('pageSize', '20');
      const response = await api.get<PaginatedResponse<Session>>(`/sessions?${params}`);
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast({ title: t('common.success'), description: 'Session deleted' });
    },
    onError: () => {
      toast({ title: t('common.error'), description: 'Failed to delete session', variant: 'destructive' });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'default';
      case 'PAUSED': return 'warning';
      case 'CLOSED': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('sessions.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('sessions.product')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All products</SelectItem>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('sessions.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="OPEN">{t('sessions.statuses.OPEN')}</SelectItem>
              <SelectItem value="PAUSED">{t('sessions.statuses.PAUSED')}</SelectItem>
              <SelectItem value="CLOSED">{t('sessions.statuses.CLOSED')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sessions.product')}</TableHead>
                  <TableHead>{t('sessions.workstation')}</TableHead>
                  <TableHead>{t('sessions.user')}</TableHead>
                  <TableHead>{t('sessions.status')}</TableHead>
                  <TableHead>{t('sessions.startedAt')}</TableHead>
                  <TableHead>{t('sessions.itemsCount')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionsData?.data?.map((session: any) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.product?.code}
                    </TableCell>
                    <TableCell>{session.workstation?.name}</TableCell>
                    <TableCell>{session.user?.name}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(session.status)}>
                        {t(`sessions.statuses.${session.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDateTime(session.startedAt, i18n.language === 'cs' ? 'cs-CZ' : 'en-US')}
                    </TableCell>
                    <TableCell>{session._count?.items || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm('Are you sure? This will delete all items and defects.')) {
                            deleteMutation.mutate(session.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {sessionsData && sessionsData.totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t('common.previous')}
                </Button>
                <span className="py-2 px-4 text-sm">
                  {page} / {sessionsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === sessionsData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
