import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getShipments,
  getShipmentById,
  getShipmentSummary,
  addManualShipment,
  refreshShipment,
  archiveShipment,
  deleteShipment,
  type ManualShipmentInput,
} from '@/services/shipmentService';
import * as Haptics from 'expo-haptics';

type Filter = 'all' | 'preparing' | 'in_transit' | 'delivered';

export function useShipments(filter: Filter = 'all') {
  const dbFilter = filter === 'all' ? undefined : filter;
  return useQuery({
    queryKey: ['shipments', filter],
    queryFn: () => getShipments(dbFilter),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useShipment(id: string | null) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: () => (id ? getShipmentById(id) : null),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useShipmentSummary() {
  return useQuery({
    queryKey: ['shipmentSummary'],
    queryFn: getShipmentSummary,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAddManualShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualShipmentInput) => addManualShipment(input),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentSummary'] });
    },
  });
}

export function useRefreshShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) => refreshShipment(shipmentId),
    onSuccess: (updated) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipment', updated.id] });
      qc.invalidateQueries({ queryKey: ['shipmentSummary'] });
    },
  });
}

export function useArchiveShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) => archiveShipment(shipmentId),
    onMutate: () => Haptics.selectionAsync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentSummary'] });
    },
  });
}

export function useDeleteShipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shipmentId: string) => deleteShipment(shipmentId),
    onMutate: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['shipmentSummary'] });
    },
  });
}
