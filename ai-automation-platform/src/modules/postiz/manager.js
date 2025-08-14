import { encryptSecret } from '../../core/crypto.js';

// Postiz (social accounts) manager
export function createPostizManager(pool) {
  return {
    async listAccounts(filter = {}) {
      const cond = []; const vals = [];
      if (filter.platform) { vals.push(filter.platform); cond.push(`platform = $${vals.length}`); }
      if (filter.status) { vals.push(filter.status); cond.push(`status = $${vals.length}`); }
      const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
      const { rows } = await pool.query(`SELECT id, platform, username, display_name, status, created_at, updated_at FROM social_accounts ${where} ORDER BY created_at DESC`, vals);
      return rows;
    },

    async createAccount({ platform, username, display_name, access_token, refresh_token }) {
      if (!platform || !username) throw new Error('platform and username required');
      const key = process.env.ADMIN_KMS_KEY || 'dev-key';
      let access_token_enc = null; let refresh_token_enc = null;
      if (access_token) {
        const { ciphertext, iv, tag } = encryptSecret(access_token, key);
        access_token_enc = JSON.stringify({ ciphertext, iv, tag });
      }
      if (refresh_token) {
        const { ciphertext, iv, tag } = encryptSecret(refresh_token, key);
        refresh_token_enc = JSON.stringify({ ciphertext, iv, tag });
      }
      const { rows } = await pool.query(`INSERT INTO social_accounts (platform, username, display_name, access_token_enc, refresh_token_enc, status) VALUES ($1,$2,$3,$4,$5,'inactive') RETURNING id, platform, username, display_name, status, created_at, updated_at`, [platform, username, display_name || null, access_token_enc, refresh_token_enc]);
      return rows[0];
    },

    async getAccount(id) {
      const { rows } = await pool.query(`SELECT id, platform, username, display_name, status, created_at, updated_at FROM social_accounts WHERE id = $1`, [id]);
      return rows[0] || null;
    },

    async updateAccount(id, updates) {
      const allowed = ['display_name', 'status'];
      const sets = []; const vals = [];
      for (const [k,v] of Object.entries(updates)) {
        if (!allowed.includes(k)) continue; vals.push(v); sets.push(`${k} = $${vals.length}`);
      }
      if (!sets.length) return this.getAccount(id);
      vals.push(id);
      const { rows } = await pool.query(`UPDATE social_accounts SET ${sets.join(', ')}, updated_at = now() WHERE id = $${vals.length} RETURNING id, platform, username, display_name, status, created_at, updated_at`, vals);
      return rows[0] || null;
    },

    async rotateTokens(id, { access_token, refresh_token }) {
      const key = process.env.ADMIN_KMS_KEY || 'dev-key';
      const sets = []; const vals = []; let idx = 1;
      if (access_token) { const { ciphertext, iv, tag } = encryptSecret(access_token, key); sets.push(`access_token_enc = $${idx++}`); vals.push(JSON.stringify({ ciphertext, iv, tag })); }
      if (refresh_token) { const { ciphertext, iv, tag } = encryptSecret(refresh_token, key); sets.push(`refresh_token_enc = $${idx++}`); vals.push(JSON.stringify({ ciphertext, iv, tag })); }
      if (!sets.length) throw new Error('no tokens provided');
      vals.push(id);
      const { rows } = await pool.query(`UPDATE social_accounts SET ${sets.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING id, platform, username, display_name, status, created_at, updated_at`, vals);
      return rows[0] || null;
    },

    async deleteAccount(id) {
      const { rowCount } = await pool.query('DELETE FROM social_accounts WHERE id=$1', [id]);
      return rowCount > 0;
    }
  };
}

export default createPostizManager;
// (Removed stray debug line)
