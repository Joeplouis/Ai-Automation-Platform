import { encryptSecret } from '../../core/crypto.js';

// Affiliate Networks Manager CRUD
export function createAffiliateManager(pool) {
  return {
    async listNetworks(filter = {}) {
      const cond = []; const vals = [];
      if (filter.status) { vals.push(filter.status); cond.push(`status = $${vals.length}`); }
      if (filter.name) { vals.push(filter.name); cond.push(`name = $${vals.length}`); }
      const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
      const { rows } = await pool.query(`SELECT id, name, base_url, status, created_at, updated_at FROM affiliate_networks ${where} ORDER BY created_at DESC`, vals);
      return rows;
    },

    async createNetwork({ name, base_url, api_key }) {
      if (!name) throw new Error('name required');
      const key = process.env.ADMIN_KMS_KEY || 'dev-key';
      let api_key_enc = null;
      if (api_key) { const { ciphertext, iv, tag } = encryptSecret(api_key, key); api_key_enc = JSON.stringify({ ciphertext, iv, tag }); }
      const { rows } = await pool.query(`INSERT INTO affiliate_networks (name, base_url, api_key_enc, status) VALUES ($1,$2,$3,'inactive') RETURNING id, name, base_url, status, created_at, updated_at`, [name, base_url || null, api_key_enc]);
      return rows[0];
    },

    async getNetwork(id) {
      const { rows } = await pool.query(`SELECT id, name, base_url, status, created_at, updated_at FROM affiliate_networks WHERE id = $1`, [id]);
      return rows[0] || null;
    },

    async updateNetwork(id, updates) {
      const allowed = ['name','base_url','status'];
      const sets = []; const vals = [];
      for (const [k,v] of Object.entries(updates)) { if (!allowed.includes(k)) continue; vals.push(v); sets.push(`${k} = $${vals.length}`); }
      if (!sets.length) return this.getNetwork(id);
      vals.push(id);
      const { rows } = await pool.query(`UPDATE affiliate_networks SET ${sets.join(', ')}, updated_at = now() WHERE id = $${vals.length} RETURNING id, name, base_url, status, created_at, updated_at`, vals);
      return rows[0] || null;
    },

    async rotateKey(id, api_key) {
      if (!api_key) throw new Error('api_key required');
      const key = process.env.ADMIN_KMS_KEY || 'dev-key';
      const { ciphertext, iv, tag } = encryptSecret(api_key, key);
      const { rows } = await pool.query(`UPDATE affiliate_networks SET api_key_enc = $1, updated_at = now() WHERE id = $2 RETURNING id, name, base_url, status, created_at, updated_at`, [JSON.stringify({ ciphertext, iv, tag }), id]);
      return rows[0] || null;
    },

    async deleteNetwork(id) {
      const { rowCount } = await pool.query('DELETE FROM affiliate_networks WHERE id=$1', [id]);
      return rowCount > 0;
    }
  };
}

export default createAffiliateManager;
