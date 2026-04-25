import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchCampaignsForUser, markCampaignRead } from '@/services/queries';

export function useCampaigns() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['campaigns', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchCampaignsForUser(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (campaignId: string) => {
      if (!user) throw new Error('Not signed in');
      return markCampaignRead(user.id, campaignId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return { ...query, markRead };
}
