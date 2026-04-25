import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { addSavedProduct, fetchSavedProducts, removeSavedProduct } from '@/services/queries';

export function useSavedProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['savedProducts', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchSavedProducts(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['savedProducts'] });
    qc.invalidateQueries({ queryKey: ['products'] });
  };

  const add = useMutation({
    mutationFn: (productId: string) => {
      if (!user) throw new Error('Not signed in');
      return addSavedProduct(user.id, productId);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (productId: string) => {
      if (!user) throw new Error('Not signed in');
      return removeSavedProduct(user.id, productId);
    },
    onSuccess: invalidate,
  });

  const isSaved = (productId: string) => (query.data ?? []).some((p) => p.id === productId);

  return { ...query, add, remove, isSaved };
}
