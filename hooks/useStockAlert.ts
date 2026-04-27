import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addStockAlert, removeStockAlert, hasStockAlert } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';

export function useStockAlert(productId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: isAlerted = false } = useQuery({
    queryKey: ['stock-alert', productId, user?.id],
    queryFn: () => hasStockAlert(user!.id, productId),
    enabled: !!user && !!productId,
    staleTime: 60_000,
  });

  const toggle = useMutation({
    mutationFn: () =>
      isAlerted
        ? removeStockAlert(user!.id, productId)
        : addStockAlert(user!.id, productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock-alert', productId, user?.id] }),
  });

  return { isAlerted, toggle };
}
