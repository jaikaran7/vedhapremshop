'use client';

import { useMutation } from '@tanstack/react-query';
import { processApproval } from '@/api/approvals.api';
import { useInvalidateMandi } from '@/hooks/mutations/invalidate';

export function useProcessApprovalMutation() {
  const invalidate = useInvalidateMandi();
  return useMutation({
    mutationFn: ({
      approvalId,
      action,
      notes,
    }: {
      approvalId: string;
      action: 'APPROVE' | 'REJECT';
      notes?: string;
    }) => processApproval(approvalId, action, notes),
    onSuccess: invalidate,
  });
}
