import { useQuery } from '@tanstack/react-query';
import { getOrCreateReferralCode } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';

export function useReferral() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: () => getOrCreateReferralCode(user!.id),
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });
}
