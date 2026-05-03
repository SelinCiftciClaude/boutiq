import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  getFavorites,
  addFavorite,
  updateFavorite,
  deleteFavorite,
  refreshFavoritePrice,
  getFavoritePriceHistory,
  type AddFavoriteInput,
  type Favorite,
} from '@/services/favoritesService';

export function useFavorites(collectionId?: string | null) {
  return useQuery({
    queryKey: ['favorites', collectionId ?? 'all'],
    queryFn: () => getFavorites(collectionId),
    staleTime: 30_000,
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddFavoriteInput) => addFavorite(input),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUpdateFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateFavorite>[1] }) =>
      updateFavorite(id, patch),
    onMutate: () => Haptics.selectionAsync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useDeleteFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFavorite(id),
    onMutate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useRefreshFavoritePrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => refreshFavoritePrice(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

export function useFavoritePriceHistory(favoriteId: string | null) {
  return useQuery({
    queryKey: ['favPriceHistory', favoriteId],
    queryFn: () => (favoriteId ? getFavoritePriceHistory(favoriteId) : []),
    enabled: !!favoriteId,
    staleTime: 60_000,
  });
}
