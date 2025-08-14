import { encryptSecret } from '../../core/crypto.js';
import fetch from 'node-fetch';

// WordPress Manager: manages wp_sites records and admin credentials + REST API integration
export function createWordPressManager(pool) {
  // Helper function to make WordPress REST API calls
  async function makeWordPressAPICall(endpoint, options = {}) {
    const wpApiUrl = process.env.WP_API_URL;
    const wpUsername = process.env.WP_USERNAME;
    const wpPassword = process.env.WP_APP_PASSWORD;

    if (!wpApiUrl || !wpUsername || !wpPassword) {
      throw new Error('WordPress API credentials not configured. Check WP_API_URL, WP_USERNAME, and WP_APP_PASSWORD environment variables.');
    }

    const authString = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const response = await fetch(`${wpApiUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WordPress API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  return {
    // Existing site management functions
    async listSites(filter = {}) {
      const conditions = [];
      const values = [];
      if (filter.status) { values.push(filter.status); conditions.push(`status = $${values.length}`); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(`SELECT id, domain, url, status, admin_user, created_at, updated_at FROM wp_sites ${where} ORDER BY created_at DESC`, values);
      return rows.map(r => ({ ...r, has_admin_pass: Boolean(r.admin_user) }));
    },

    async createSite({ domain, url }) {
      if (!domain || !url) throw new Error('domain and url required');
      if (!/^https?:\/\//i.test(url)) throw new Error('url must be http(s)');
      const { rows } = await pool.query(`INSERT INTO wp_sites (domain, url, status) VALUES ($1,$2,'provisioning') RETURNING id, domain, url, status, admin_user, created_at, updated_at`, [domain, url]);
      return rows[0];
    },

    async getSite(id) {
      const { rows } = await pool.query(`SELECT id, domain, url, status, admin_user, created_at, updated_at FROM wp_sites WHERE id = $1`, [id]);
      const r = rows[0];
      return r ? { ...r, has_admin_pass: Boolean(r.admin_user) } : null;
    },

    async updateSite(id, updates) {
      const allowed = ['domain', 'url', 'status'];
      const sets = []; const values = [];
      for (const [k, v] of Object.entries(updates)) {
        if (!allowed.includes(k)) continue; values.push(v); sets.push(`${k} = $${values.length}`);
      }
      if (!sets.length) return this.getSite(id);
      values.push(id);
      const { rows } = await pool.query(`UPDATE wp_sites SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING id, domain, url, status, admin_user, created_at, updated_at`, values);
      return rows[0] || null;
    },

    async setAdminCredentials(id, { admin_user, admin_pass }) {
      if (!admin_user || !admin_pass) throw new Error('admin_user and admin_pass required');
      const key = process.env.ADMIN_KMS_KEY || 'dev-key';
      const { ciphertext, iv, tag } = encryptSecret(admin_pass, key);
      const enc = JSON.stringify({ ciphertext, iv, tag });
      const { rows } = await pool.query(`UPDATE wp_sites SET admin_user = $1, admin_pass_enc = $2, updated_at = now(), status = CASE WHEN status='provisioning' THEN 'active' ELSE status END WHERE id = $3 RETURNING id, domain, url, status, admin_user, created_at, updated_at`, [admin_user, enc, id]);
      return rows[0] || null;
    },

    async deleteSite(id) {
      const { rowCount } = await pool.query('DELETE FROM wp_sites WHERE id = $1', [id]);
      return rowCount > 0;
    },

    // New WordPress REST API functions
    async getPosts(params = {}) {
      const queryParams = new URLSearchParams({
        per_page: params.per_page || 10,
        page: params.page || 1,
        status: params.status || 'publish',
        ...params
      });
      return makeWordPressAPICall(`/posts?${queryParams}`);
    },

    async getPost(id) {
      return makeWordPressAPICall(`/posts/${id}`);
    },

    async createPost({ title, content, status = 'draft', categories = [], tags = [], excerpt = '', featured_media = null }) {
      const postData = {
        title,
        content,
        status,
        categories,
        tags,
        excerpt
      };
      
      if (featured_media) {
        postData.featured_media = featured_media;
      }

      return makeWordPressAPICall('/posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      });
    },

    async updatePost(id, updates) {
      return makeWordPressAPICall(`/posts/${id}`, {
        method: 'POST',
        body: JSON.stringify(updates)
      });
    },

    async deletePost(id) {
      return makeWordPressAPICall(`/posts/${id}`, {
        method: 'DELETE'
      });
    },

    async getPages(params = {}) {
      const queryParams = new URLSearchParams({
        per_page: params.per_page || 10,
        page: params.page || 1,
        status: params.status || 'publish',
        ...params
      });
      return makeWordPressAPICall(`/pages?${queryParams}`);
    },

    async createPage({ title, content, status = 'draft', parent = 0, template = '' }) {
      const pageData = {
        title,
        content,
        status,
        parent
      };
      
      if (template) {
        pageData.template = template;
      }

      return makeWordPressAPICall('/pages', {
        method: 'POST',
        body: JSON.stringify(pageData)
      });
    },

    async getCategories() {
      return makeWordPressAPICall('/categories');
    },

    async createCategory({ name, description = '', parent = 0 }) {
      return makeWordPressAPICall('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description, parent })
      });
    },

    async getTags() {
      return makeWordPressAPICall('/tags');
    },

    async createTag({ name, description = '' }) {
      return makeWordPressAPICall('/tags', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
    },

    async getUsers() {
      return makeWordPressAPICall('/users');
    },

    async getCurrentUser() {
      return makeWordPressAPICall('/users/me');
    },

    async getSiteSettings() {
      return makeWordPressAPICall('/settings');
    },

    async updateSiteSettings(settings) {
      return makeWordPressAPICall('/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },

    async uploadMedia(file, title = '', altText = '') {
      // For file uploads, we need different headers
      const wpApiUrl = process.env.WP_API_URL;
      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_APP_PASSWORD;

      const authString = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
      
      const formData = new FormData();
      formData.append('file', file);
      if (title) formData.append('title', title);
      if (altText) formData.append('alt_text', altText);

      const response = await fetch(`${wpApiUrl}/media`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress media upload error (${response.status}): ${errorText}`);
      }

      return response.json();
    },

    async getMedia(params = {}) {
      const queryParams = new URLSearchParams({
        per_page: params.per_page || 10,
        page: params.page || 1,
        ...params
      });
      return makeWordPressAPICall(`/media?${queryParams}`);
    }
  };
}

export default createWordPressManager;
