import { apiClient } from '@/api/client';
import type { ApprovalRequest } from '@/types';

export async function listApprovals(): Promise<ApprovalRequest[]> {
  return apiClient<ApprovalRequest[]>('/approvals');
}

export async function processApproval(
  approvalId: string,
  action: 'APPROVE' | 'REJECT',
  notes?: string
): Promise<void> {
  return apiClient<void>(`/approvals/${approvalId}`, {
    method: 'POST',
    body: JSON.stringify({ action, notes }),
  });
}
