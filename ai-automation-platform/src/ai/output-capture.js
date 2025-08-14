// AI Output Capture Wrapper (Task 1.10)
// Persists AI generation outputs into ai_outputs table.
// Provides record() and wrap() utilities.

export function createOutputCapture({ pool, defaultModel = 'stub-model', scorer = null, autoEscalate = true, escalateThresholdEnv = 'AI_REVIEW_THRESHOLD', auditLogger = null, metrics = null }) {
  if (!pool) throw new Error('pool required');

  async function record({ prompt, model, output, confidence = null }) {
    const textPrompt = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const modelName = model || defaultModel;
    const outJson = output && typeof output === 'object' ? output : { value: output };
    const { rows } = await pool.query(
      'INSERT INTO ai_outputs (prompt, model, output, confidence) VALUES ($1,$2,$3,$4) RETURNING id, created_at',
      [textPrompt, modelName, outJson, confidence]
    );
    return rows[0];
  }

  function wrap(fn, { model } = {}) {
    if (typeof fn !== 'function') throw new Error('fn must be function');
    return async function wrapped(promptArgs) {
      const output = await fn(promptArgs);
      const rec = await record({ prompt: promptArgs, model, output });
      if (metrics && typeof metrics.incAIOutputs === 'function') {
        try { metrics.incAIOutputs({ autoEscalated: false }); } catch {}
      }
      let confidence = null;
      if (scorer) {
        try {
          confidence = await scorer.score(output);
          if (typeof confidence === 'number' && !Number.isNaN(confidence)) {
            await pool.query('UPDATE ai_outputs SET confidence=$1 WHERE id=$2', [confidence, rec.id]);
          }
        } catch (e) {
          // swallow scoring errors
        }
      }
      // Auto-escalation: if enabled and below threshold, create human_reviews row (pending)
      if (autoEscalate) {
        try {
          const thresholdRaw = process.env[escalateThresholdEnv] || '0.4';
            const threshold = Number(thresholdRaw);
            if (!Number.isNaN(threshold) && (confidence === null || confidence < threshold)) {
              await pool.query('INSERT INTO human_reviews (ai_output_id, status, notes) VALUES ($1,$2,$3)', [rec.id, 'pending', 'Auto-escalated due to low confidence']);
              if (metrics && typeof metrics.incAIOutputs === 'function') {
                try { metrics.incAIOutputs({ autoEscalated: true }); } catch {}
              }
              if (auditLogger) {
                await auditLogger.log({ action: 'auto_escalate', entity_type: 'ai_output', entity_id: String(rec.id), metadata: { confidence, threshold } });
              }
            }
        } catch (e) {
          // ignore escalation errors
        }
      }
      return { output, meta: { ai_output_id: rec.id, created_at: rec.created_at, confidence } };
    };
  }

  return { record, wrap };
}

export default createOutputCapture;
