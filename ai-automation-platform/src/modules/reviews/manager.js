// Review Queue Manager (Task 1.6)
// Handles CRUD & workflow for human_reviews table.
// Provides safe status transitions and claiming.

import { REVIEW_STATUS } from '../../core/review-status.js';

const VALID_TRANSITIONS = Object.freeze({
  [REVIEW_STATUS.PENDING]: new Set([REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED, REVIEW_STATUS.ESCALATED]),
  [REVIEW_STATUS.ESCALATED]: new Set([REVIEW_STATUS.APPROVED, REVIEW_STATUS.REJECTED]),
  [REVIEW_STATUS.APPROVED]: new Set(),
  [REVIEW_STATUS.REJECTED]: new Set()
});

export function createReviewQueueManager(pool) {
  if (!pool) throw new Error('pool required');

  async function createReview({ ai_output_id, status = REVIEW_STATUS.PENDING, notes = null }) {
    const { rows } = await pool.query(
      'INSERT INTO human_reviews (ai_output_id, status, notes) VALUES ($1,$2,$3) RETURNING *',
      [ai_output_id, status, notes]
    );
    return rows[0];
  }

  async function getById(id) {
    const { rows } = await pool.query('SELECT * FROM human_reviews WHERE id=$1', [id]);
    return rows[0] || null;
  }

  async function list({ status } = {}) {
    if (status) {
      const { rows } = await pool.query('SELECT * FROM human_reviews WHERE status=$1 ORDER BY created_at ASC', [status]);
      return rows;
    }
    const { rows } = await pool.query('SELECT * FROM human_reviews ORDER BY created_at DESC');
    return rows;
  }

  async function listPending(limit = 50) {
    const { rows } = await pool.query(
      'SELECT * FROM human_reviews WHERE status=$1 ORDER BY created_at ASC LIMIT $2',
      [REVIEW_STATUS.PENDING, limit]
    );
    return rows;
  }

  async function claim({ id, reviewer_id }) {
    const { rows } = await pool.query(
      'UPDATE human_reviews SET reviewer_id=$1, updated_at=now() WHERE id=$2 AND reviewer_id IS NULL AND status=$3 RETURNING *',
      [reviewer_id, id, REVIEW_STATUS.PENDING]
    );
    return rows[0] || null; // null if already claimed or not pending
  }

  async function updateStatus({ id, status, reviewer_id = null, notes = null }) {
    const current = await getById(id);
    if (!current) throw new Error('review not found');
    if (current.status === status) return current; // idempotent
    if (!VALID_TRANSITIONS[current.status] || !VALID_TRANSITIONS[current.status].has(status)) {
      throw new Error(`invalid transition ${current.status} -> ${status}`);
    }
    const { rows } = await pool.query(
      'UPDATE human_reviews SET status=$1, reviewer_id=COALESCE($2, reviewer_id), notes=COALESCE($3, notes), updated_at=now() WHERE id=$4 RETURNING *',
      [status, reviewer_id, notes, id]
    );
    return rows[0];
  }

  async function approve({ id, reviewer_id, notes }) {
    return updateStatus({ id, status: REVIEW_STATUS.APPROVED, reviewer_id, notes });
  }

  async function reject({ id, reviewer_id, notes }) {
    return updateStatus({ id, status: REVIEW_STATUS.REJECTED, reviewer_id, notes });
  }

  async function escalate({ id, notes }) {
    return updateStatus({ id, status: REVIEW_STATUS.ESCALATED, notes });
  }

  return {
    createReview,
    getById,
    list,
    listPending,
    claim,
    updateStatus,
    approve,
    reject,
    escalate
  };
}

export default createReviewQueueManager;
