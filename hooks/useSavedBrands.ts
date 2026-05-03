import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { addSavedBrand, fetchSavedBrands, removeSavedBrand } from '@/services/queries';

export function useSavedBrands() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['savedBrands', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchSavedBrands(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: 3,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['savedBrands'] });
    qc.invalidateQueries({ queryKey: ['brands'] });
    qc.invalidateQueries({ queryKey: ['campaigns'] });
  };

  const add = useMutation({
    mutationFn: ({ brandId, isFavorite = false }: { brandId: string; isFavorite?: boolean }) => {
      if (!user) throw new Error('Not signed in');
      return addSavedBrand(user.id, brandId, isFavorite);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (brandId: string) => {
      if (!user) throw new Error('Not signed in');
      return removeSavedBrand(user.id, brandId);
    },
    onSuccess: invalidate,
  });

  const isSaved = (brandId: string) => (query.data ?? []).some((b) => b.id === brandId);

  return { ...query, add, remove, isSaved };
}
