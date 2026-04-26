import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchShipments, addManualShipment } from '@/services/queries';

export function useShipments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['shipments', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchShipments(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
  });

  const add = useMutation({
    mutationFn: (params: { brandName: string; orderNumber: string; trackingNumber?: string; carrier: string }) => {
      if (!user) throw new Error('Not signed in');
      return addManualShipment(user.id, params);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipments', user?.id] }),
  });

  return { ...query, add };
}
