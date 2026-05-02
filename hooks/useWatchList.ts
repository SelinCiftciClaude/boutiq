import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWatchList,
  removeWatch,
  getNotificationPrefs,
  upsertNotificationPrefs,
  type NotificationPreferences,
} from '@/services/priceWatchService';

type Filter = 'all' | 'price_drop' | 'low_stock' | 'back_in_stock';

export function useWatchList(filter: Filter = 'all') {
  const dbFilter = filter === 'all' ? undefined : filter;
  return useQuery({
    queryKey: ['watchList', filter],
    queryFn: () => getWatchList(dbFilter),
    staleTime: 60_000,
  });
}

export function useRemoveWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => removeWatch(productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['watchList'] }),
  });
}

export function useNotificationPrefs() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notificationPrefs'],
    queryFn: getNotificationPrefs,
    staleTime: 5 * 60_000,
  });

  const update = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => upsertNotificationPrefs(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificationPrefs'] }),
  });

  return { ...query, update };
}
