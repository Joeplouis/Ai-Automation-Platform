// Review Routes (Tasks 1.7 & 1.8)
// Submission and decision endpoints for human review queue.
import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { createReviewQueueManager } from '../modules/reviews/manager.js';
import { createAuditLogger } from '../core/audit.js';

export function initializeReviewRoutes(pool) {
  const router = express.Router();
  const mgr = createReviewQueueManager(pool);
  const audit = createAuditLogger(pool);

  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { ai_output_id, notes } = req.body || {};
      if (!ai_output_id) return res.status(400).json({ error: 'ai_output_id required' });
      const created = await mgr.createReview({ ai_output_id, notes });
  await audit.log({ actor_id: req.user?.id, action: 'review_submitted', entity_type: 'human_review', entity_id: String(created.id), metadata: { ai_output_id, notes } });
  res.status(201).json({ success: true, review: created });
    } catch (e) {
      console.error('[reviews] create error', e);
      res.status(500).json({ error: 'Failed to create review' });
    }
  });

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const { status } = req.query;
      const list = await mgr.list({ status });
      res.json({ success: true, reviews: list });
    } catch (e) {
      console.error('[reviews] list error', e);
      res.status(500).json({ error: 'Failed to list reviews' });
    }
  });

  router.patch('/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, notes } = req.body || {};
      if (!action) return res.status(400).json({ error: 'action required' });
      let updated;
  switch (action) {
        case 'approve':
          updated = await mgr.approve({ id, reviewer_id: req.user?.id, notes });
          break;
        case 'reject':
          updated = await mgr.reject({ id, reviewer_id: req.user?.id, notes });
          break;
        case 'escalate':
          updated = await mgr.escalate({ id, notes });
          break;
        default:
          return res.status(400).json({ error: 'invalid action' });
      }
  await audit.log({ actor_id: req.user?.id, action: `review_${action}`, entity_type: 'human_review', entity_id: String(id), metadata: { notes } });
      res.json({ success: true, review: updated });
    } catch (e) {
      if (e.message === 'review not found') return res.status(404).json({ error: 'not found' });
      if (e.message.startsWith('invalid transition')) return res.status(409).json({ error: e.message });
      console.error('[reviews] patch error', e);
      res.status(500).json({ error: 'Failed to update review' });
    }
  });

  return router;
}

export default initializeReviewRoutes;
