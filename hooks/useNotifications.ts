import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
  // Mock data için local okundu override'ı
  const [mockReadIds, setMockReadIds] = useState<Set<string>>(new Set());
  const [allMockRead, setAllMockRead] = useState(false);

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const dbNotifs = await fetchNotifications(user!.id);
      if (dbNotifs.length === 0) return null; // mock kullanılacak
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
        isMock: false,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const usingMock = query.data === null || query.data === undefined;

  const notifications = usingMock
    ? MOCK_NOTIFICATIONS.map((n) => ({
        ...n,
        isRead: allMockRead || mockReadIds.has(n.id) || n.isRead,
        isMock: true,
      }))
    : (query.data ?? []);

  const markRead = useMutation({
    mutationFn: (id: string) => {
      if (usingMock) {
        setMockReadIds((prev) => new Set([...prev, id]));
        return Promise.resolve();
      }
      return markNotificationRead(id);
    },
    onSuccess: (_, id) => {
      if (!usingMock)
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => {
      if (usingMock) {
        setAllMockRead(true);
        return Promise.resolve();
      }
      return markAllNotificationsRead(user!.id);
    },
    onSuccess: () => {
      if (!usingMock)
        queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return { data: notifications, isLoading: query.isLoading, markRead, markAllRead, unreadCount };
}
