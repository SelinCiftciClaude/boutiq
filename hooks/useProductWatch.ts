import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  addWatch,
  removeWatch,
  isWatched,
  type WatchInput,
} from '@/services/priceWatchService';

export function useProductWatch(productId: string) {
  const qc = useQueryClient();
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    if (!productId) return;
    isWatched(productId).then(setWatched);
  }, [productId]);

  const add = useMutation({
    mutationFn: (input: WatchInput) => addWatch(input),
    onMutate: () => {
      setWatched(true); // optimistic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => setWatched(false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchList'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => removeWatch(productId),
    onMutate: () => {
      setWatched(false); // optimistic
      Haptics.selectionAsync();
    },
    onError: () => setWatched(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['watchList'] });
    },
  });

  return { watched, add, remove };
}
