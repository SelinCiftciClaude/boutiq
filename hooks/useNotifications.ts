import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/services/queries';
import { useAuth } from '@/context/AuthContext';
import { MOCK_NOTIFICATIONS } from '@/constants/MockData';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const dbNotifs = await fetchNotifications(user!.id);
      // DB boşsa mock verileri göster
      if (dbNotifs.length === 0) return MOCK_NOTIFICATIONS;
      return dbNotifs.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.is_read,
        createdAt: n.created_at,
        brandId: n.data?.brandId ?? null,
        brandName: n.data?.brandName ?? null,
        brandLogo: n.data?.brandLogo ?? null,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] }),
  });

  const unreadCount = (query.data ?? []).filter((n: any) => !n.isRead).length;

  return { ...query, markRead, markAllRead, unreadCount };
}
