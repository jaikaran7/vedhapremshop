import { apiClient, emulateApi } from '@/api/client';
import { isMockApi } from '@/config/env';
import { mockRepository } from '@/data/mock-repository';
import type { ApprovalRequest } from '@/types';

export async function listApprovals(): Promise<ApprovalRequest[]> {
  if (isMockApi()) return emulateApi(mockRepository.listApprovals());
  return apiClient<ApprovalRequest[]>('/approvals');
}

export async function processApproval(
  approvalId: string,
  action: 'APPROVE' | 'REJECT',
  notes?: string
): Promise<void> {
  if (isMockApi()) return emulateApi(mockRepository.processApproval(approvalId, action, notes));
  return apiClient<void>(`/approvals/${approvalId}`, {
    method: 'POST',
    body: JSON.stringify({ action, notes }),
  });
}
