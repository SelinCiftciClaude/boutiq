import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchReviews, upsertReview } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';

export function useReviews(brandId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['reviews', brandId],
    queryFn: () => fetchReviews(brandId),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  const myReview = query.data?.find(r => r.userId === user?.id);
  const avgRating = query.data?.length
    ? query.data.reduce((s, r) => s + r.rating, 0) / query.data.length
    : null;

  const submit = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment: string }) =>
      upsertReview(user!.id, brandId, rating, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews', brandId] }),
  });

  return { query, myReview, avgRating, submit };
}
