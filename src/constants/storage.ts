export const STORAGE_PREFIX = 'vedhaprem_mandi_v2_';

export const STORAGE_KEYS = {
  currentUser: `${STORAGE_PREFIX}current_user`,
  /** In-progress vendor bill. Kept when legacy mock keys are cleared, so closing the page does not drop it. */
  purchaseDraft: `${STORAGE_PREFIX}purchase_draft`,
  /** Set after the one-time 26 Oct 2026 KA test lot is offered, so discarding it does not bring it back. */
  purchaseDraftSeeded: `${STORAGE_PREFIX}purchase_draft_seeded`,
} as const;
