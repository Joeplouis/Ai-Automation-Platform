export const REVIEW_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated'
});

export const REVIEW_TERMINAL = new Set([REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED]);
