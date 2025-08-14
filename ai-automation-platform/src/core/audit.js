// Audit Logger (Task 1.13)
// Provides simple append-only audit logging.

export function createAuditLogger(pool) {
  if (!pool) throw new Error('pool required');

  async function log({ actor_id = null, actor_type = 'user', action, entity_type = null, entity_id = null, metadata = null }) {
    if (!action) throw new Error('action required');
    const metaJson = metadata ? JSON.stringify(metadata) : null;
    await pool.query(
      'INSERT INTO audit_logs (actor_id, actor_type, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
      [actor_id, actor_type, action, entity_type, entity_id, metaJson]
    );
  }

  async function recent({ limit = 50, action = null }) {
    if (action) {
      const { rows } = await pool.query('SELECT * FROM audit_logs WHERE action=$1 ORDER BY id DESC LIMIT $2', [action, limit]);
      return rows;
    }
    const { rows } = await pool.query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT $1', [limit]);
    return rows;
  }

  return { log, recent };
}

export default createAuditLogger;
