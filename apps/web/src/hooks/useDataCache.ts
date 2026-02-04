import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { db, cacheProducts, cacheWorkstations, cacheDefectTypes } from '@/db';
import type { Product, Workstation, DefectType } from '@glass-inspector/shared';

/**
 * Hook to prefetch and cache essential data for offline use
 */
export function useDataCache() {
  const queryClient = useQueryClient();

  // Fetch and cache products
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await api.get<Product[]>('/products');
      const data = response.data || [];
      // Cache to IndexedDB
      await cacheProducts(data);
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch and cache workstations
  const { data: workstations } = useQuery({
    queryKey: ['workstations'],
    queryFn: async () => {
      const response = await api.get<Workstation[]>('/workstations');
      const data = response.data || [];
      await cacheWorkstations(data);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch and cache defect types
  const { data: defectTypes } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: async () => {
      const response = await api.get<DefectType[]>('/defect-types');
      const data = response.data || [];
      await cacheDefectTypes(data);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Load from IndexedDB if offline
  useEffect(() => {
    const loadFromCache = async () => {
      if (!navigator.onLine) {
        const [cachedProducts, cachedWorkstations, cachedDefectTypes] = await Promise.all([
          db.products.toArray(),
          db.workstations.toArray(),
          db.defectTypes.toArray(),
        ]);

        if (cachedProducts.length > 0) {
          queryClient.setQueryData(['products'], cachedProducts);
        }
        if (cachedWorkstations.length > 0) {
          queryClient.setQueryData(['workstations'], cachedWorkstations);
        }
        if (cachedDefectTypes.length > 0) {
          queryClient.setQueryData(['defectTypes'], cachedDefectTypes);
        }
      }
    };

    loadFromCache();
  }, [queryClient]);

  return {
    products: products || [],
    workstations: workstations || [],
    defectTypes: defectTypes || [],
    isLoaded: !!products && !!workstations && !!defectTypes,
  };
}
