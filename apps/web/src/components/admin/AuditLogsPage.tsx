import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import type { AuditLogWithUser, PaginatedResponse } from '@glass-inspector/shared';

export function AuditLogsPage() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['auditLogs', page],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<AuditLogWithUser>>(
        `/audit-logs?page=${page}&pageSize=50`
      );
      return response.data;
    },
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE': return 'success';
      case 'UPDATE': return 'default';
      case 'DELETE': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.auditLogs')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData?.data?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(log.createdAt, i18n.language === 'cs' ? 'cs-CZ' : 'en-US')}
                    </TableCell>
                    <TableCell>{log.user?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.entityId.slice(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))}
                {(!logsData?.data || logsData.data.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {logsData && logsData.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t('common.previous')}
                </Button>
                <span className="py-2 px-4 text-sm">
                  {page} / {logsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === logsData.totalPages}
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
