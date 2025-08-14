// n8n Manager Module
// Provides CRUD & heartbeat ops over n8n_instances table.

export function createN8NManager(pool) {
  return {
    async listInstances(filter = {}) {
      const conditions = [];
      const values = [];
      if (filter.status) {
        values.push(filter.status);
        conditions.push(`status = $${values.length}`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT id, name, base_url, status, last_seen_at, created_at, updated_at
         FROM n8n_instances ${where}
         ORDER BY created_at DESC`
        , values);
      return rows;
    },

    async createInstance({ name, base_url }) {
      if (!name || !base_url) throw new Error('name and base_url required');
      if (!/^https?:\/\//i.test(base_url)) throw new Error('base_url must be http(s)');
      const { rows } = await pool.query(
        `INSERT INTO n8n_instances (name, base_url, status)
         VALUES ($1,$2,'provisioning')
         RETURNING id, name, base_url, status, last_seen_at, created_at, updated_at`,
        [name, base_url]
      );
      return rows[0];
    },

    async getInstance(id) {
      const { rows } = await pool.query(
        `SELECT id, name, base_url, status, last_seen_at, created_at, updated_at
         FROM n8n_instances WHERE id = $1`,
        [id]
      );
      return rows[0] || null;
    },

    async updateInstance(id, updates) {
      const allowed = ['name', 'base_url', 'status', 'last_seen_at'];
      const sets = [];
      const values = [];
      for (const [k, v] of Object.entries(updates)) {
        if (!allowed.includes(k)) continue;
        values.push(v);
        sets.push(`${k} = $${values.length}`);
      }
      if (!sets.length) return this.getInstance(id);
      values.push(id);
      const { rows } = await pool.query(
        `UPDATE n8n_instances SET ${sets.join(', ')}, updated_at = now()
         WHERE id = $${values.length}
         RETURNING id, name, base_url, status, last_seen_at, created_at, updated_at`,
        values
      );
      return rows[0] || null;
    },

    async recordHeartbeat(id) {
      const { rows } = await pool.query(
        `UPDATE n8n_instances SET last_seen_at = now(), status = 'online', updated_at = now()
         WHERE id = $1
         RETURNING id, name, base_url, status, last_seen_at, created_at, updated_at`,
        [id]
      );
      return rows[0] || null;
    },

    async deleteInstance(id) {
      const { rowCount } = await pool.query('DELETE FROM n8n_instances WHERE id = $1', [id]);
      return rowCount > 0;
    }
  };
}

export default createN8NManager;
// (Removed stray debug lines)
