'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ConsignmentScan, confirmScan, createScan, processScan, removeScanDocument, type SaveScanDraft, saveScanDraft, type ScanDocumentKind, uploadScanDocument,
} from '@/api/consignment-scans.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';
import { queryKeys } from '@/hooks/queries/keys';

/** Every scan write returns the whole scan; put it straight into the cache so the screen shows the server's state. */
function useScanWrite<V>(fn: (vars: V) => Promise<ConsignmentScan>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (scan) => {
      queryClient.setQueryData(queryKeys.consignmentScan(scan.id), scan);
      void queryClient.invalidateQueries({ queryKey: queryKeys.consignmentScans, exact: true });
    },
  });
}

export const useCreateScanMutation = () => useScanWrite(() => createScan());
export const useUploadScanDocumentMutation = () => useScanWrite(({ id, kind, file }: { id: string; kind: ScanDocumentKind; file: File }) => uploadScanDocument(id, kind, file));
export const useRemoveScanDocumentMutation = () => useScanWrite(({ id, documentId }: { id: string; documentId: string }) => removeScanDocument(id, documentId));
export const useProcessScanMutation = () => useScanWrite((id: string) => processScan(id));
export const useSaveScanDraftMutation = () => useScanWrite(({ id, draft }: { id: string; draft: SaveScanDraft }) => saveScanDraft(id, draft));

/** Posts the purchase and stock, so everything mandi-wide is refreshed. */
export function useConfirmScanMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({ id, version, key }: { id: string; version: number; key: string }) => confirmScan(id, version, key),
    onSuccess: invalidate,
  });
}
