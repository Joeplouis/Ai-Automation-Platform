/* eslint-disable no-useless-escape */
// VPS Management Module
// Handles server provisioning, monitoring, and deployment automation

// Note: spawn is not currently used; remove to satisfy lint
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SSH2Promise from 'ssh2-promise';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create VPS Manager
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Object} VPS manager instance
 */
export function createVPSManager(pool) {
  return {
    /**
     * List all VPS servers for a user
     * @param {string} userId - User ID
     * @returns {Array} List of servers
     */
    async listServers(userId) {
      try {
        const result = await pool.query(`
          SELECT 
            id, name, provider, server_id, ip_address, hostname,
            region, size, os, status, monitoring_enabled,
            created_at, updated_at
          FROM vps_servers
          WHERE user_id = $1
          ORDER BY created_at DESC
        `, [userId]);

        return result.rows;
      } catch (error) {
        console.error('Error listing VPS servers:', error);
        throw error;
      }
    },

    /**
     * Create a new VPS server record
     * @param {Object} serverData - Server configuration
     * @returns {Object} Created server
     */
    async createServer(serverData) {
      try {
        const {
          user_id,
          name,
          provider,
          server_id,
          ip_address,
          hostname,
          region,
          size,
          os,
          connection_config = {}
        } = serverData;

        const result = await pool.query(`
          INSERT INTO vps_servers (
            user_id, name, provider, server_id, ip_address, hostname,
            region, size, os, connection_config, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `, [
          user_id, name, provider, server_id, ip_address, hostname,
          region, size, os, JSON.stringify(connection_config), 'provisioning'
        ]);

        const server = result.rows[0];

        // Start monitoring if enabled
        if (server.monitoring_enabled) {
          this.startMonitoring(server.id);
        }

        return server;
      } catch (error) {
        console.error('Error creating VPS server:', error);
        throw error;
      }
    },

    /**
     * Get server status and monitoring data
     * @param {string} serverId - Server ID
     * @param {string} userId - User ID
     * @returns {Object} Server status
     */
    async getServerStatus(serverId, userId) {
      try {
        const serverResult = await pool.query(`
          SELECT * FROM vps_servers
          WHERE id = $1 AND user_id = $2
        `, [serverId, userId]);

        if (serverResult.rows.length === 0) {
          throw new Error('Server not found');
        }

        const server = serverResult.rows[0];

        // Get latest monitoring data
        const monitoringResult = await pool.query(`
          SELECT *
          FROM vps_monitoring
          WHERE server_id = $1
          ORDER BY recorded_at DESC
          LIMIT 1
        `, [serverId]);

        const monitoring = monitoringResult.rows[0] || null;

        // Test SSH connection if configured
        let sshStatus = 'unknown';
        if (server.connection_config && server.connection_config.ssh) {
          try {
            sshStatus = await this.testSSHConnection(server);
          } catch (error) {
            sshStatus = 'failed';
          }
        }

        return {
          server,
          monitoring,
          ssh_status: sshStatus,
          last_check: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error getting server status:', error);
        throw error;
      }
    },

    /**
     * Test SSH connection to server
     * @param {Object} server - Server configuration
     * @returns {string} Connection status
     */
    async testSSHConnection(server) {
      try {
        const sshConfig = {
          host: server.ip_address,
          port: server.connection_config.ssh?.port || 22,
          username: server.connection_config.ssh?.username || 'root',
          ...server.connection_config.ssh
        };

        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();
        
        // Test basic command
        const result = await ssh.exec('echo "test"');
        await ssh.close();

        return result.trim() === 'test' ? 'connected' : 'failed';
      } catch (error) {
        console.error('SSH connection test failed:', error);
        return 'failed';
      }
    },

    /**
     * Deploy script to server
     * @param {string} serverId - Server ID
     * @param {string} userId - User ID
     * @param {string} scriptType - Type of script to deploy
     * @param {Object} environment - Environment variables
     * @returns {Object} Deployment result
     */
  async deployScript(serverId, userId, scriptType, environment = {}) {
      try {
        const serverResult = await pool.query(`
          SELECT * FROM vps_servers
          WHERE id = $1 AND user_id = $2
        `, [serverId, userId]);

        if (serverResult.rows.length === 0) {
          throw new Error('Server not found');
        }

  const server = serverResult.rows[0];
        
  // Get the appropriate deployment script
  const scriptPath = await this.getDeploymentScript(scriptType);
        const script = await fs.readFile(scriptPath, 'utf8');

        // Replace environment variables in script
        let processedScript = script;
        for (const [key, value] of Object.entries(environment)) {
          processedScript = processedScript.replace(
            new RegExp(`\\$\\{${key}\\}`, 'g'), 
            value
          );
        }

        // Execute deployment via SSH
        const result = await this.executeRemoteScript(server, processedScript);

        // Log deployment
        await pool.query(`
          INSERT INTO task_executions (
            task_id, status, started_at, completed_at, result, logs
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          serverId, // Using server ID as task ID for deployments
          result.success ? 'completed' : 'failed',
          result.started_at,
          result.completed_at,
          JSON.stringify(result),
          result.logs
        ]);

        return result;
      } catch (error) {
        console.error('Error deploying script:', error);
        throw error;
      }
    },

    /**
     * Get deployment script path based on type
     * @param {string} scriptType - Type of deployment script
     * @returns {string} Script file path
     */
  async getDeploymentScript(scriptType) {
      // Map logical stack types to concrete script filenames
      const scriptMap = {
        // Existing types
        full_stack: 'install_full_stack.sh',
        mailcow: '10_mailcow_install.sh',
        mautic: '20_mautic_install.sh',
        n8n: '30_n8n_install.sh',
        nginx: '40_nginx_sites.sh',
        certbot: '45_certbot_certs.sh',
        prep: '01_prep.sh',
        // Additional convenience aliases used by MCP and docs
        bookaistudio: 'install_full_stack_bookaistudio.sh',
        mailcow_only: '10_mailcow_install.sh',
        n8n_only: '30_n8n_install.sh',
        // wordpress_only: attempt to find a dedicated WP installer if present
        wordpress_only: 'wordpress_install.sh'
      };

      const scriptFile = scriptMap[scriptType];
      if (!scriptFile) {
        const supported = Object.keys(scriptMap).sort().join(', ');
        throw new Error(`Unknown script type: ${scriptType}. Supported types: ${supported}`);
      }

      // Preferred lookup locations (in order):
      // 1) ai-automation-platform/scripts (if a shell script lives there)
      // 2) repo root (project-level scripts)
      // 3) youtube_automation_811 (original canonical folder per owner)
      const candidateDirs = [
        path.join(__dirname, '../../../scripts'),
        path.join(__dirname, '../../../..'),
        path.join(__dirname, '../../../..', 'youtube_automation_811')
      ];

      for (const dir of candidateDirs) {
        const p = path.join(dir, scriptFile);
        try {
          // Ensure file exists and is readable
          await fs.stat(p);
          return p;
        } catch (_) {
          // try next path
        }
      }

      // If wordpress_only is requested but no installer found, provide a helpful message
      if (scriptType === 'wordpress_only') {
        throw new Error(
          `wordpress_install.sh not found in expected locations. ` +
          `Please add a WP installer script to one of these paths: ` +
          `ai-automation-platform/scripts, project root, or youtube_automation_811.`
        );
      }

      throw new Error(`Script ${scriptFile} not found in expected locations.`);
    },

    /**
     * Execute script on remote server via SSH
     * @param {Object} server - Server configuration
     * @param {string} script - Script content to execute
     * @returns {Object} Execution result
     */
    async executeRemoteScript(server, script) {
      const startTime = new Date();
      let logs = '';
      let success = false;

      try {
        const sshConfig = {
          host: server.ip_address,
          port: server.connection_config.ssh?.port || 22,
          username: server.connection_config.ssh?.username || 'root',
          ...server.connection_config.ssh
        };

        const ssh = new SSH2Promise(sshConfig);
        await ssh.connect();

        // Create temporary script file on remote server
        const scriptPath = `/tmp/deploy_${Date.now()}.sh`;
        await ssh.exec(`cat > ${scriptPath} << 'SCRIPT_EOF'\n${script}\nSCRIPT_EOF`);
        await ssh.exec(`chmod +x ${scriptPath}`);

        // Execute script and capture output
        const result = await ssh.exec(`bash ${scriptPath} 2>&1`);
        logs = result;

        // Clean up temporary script
        await ssh.exec(`rm -f ${scriptPath}`);
        await ssh.close();

        success = true;
      } catch (error) {
        logs += `\nError: ${error.message}`;
        success = false;
      }

      return {
        success,
        started_at: startTime.toISOString(),
        completed_at: new Date().toISOString(),
        logs,
        server_id: server.id
      };
    },

    /**
     * Start monitoring for a server
     * @param {string} serverId - Server ID
     */
    async startMonitoring(serverId) {
      try {
        // This would typically set up a monitoring job
        // For now, we'll just update the server status
        await pool.query(`
          UPDATE vps_servers
          SET status = 'monitoring', updated_at = now()
          WHERE id = $1
        `, [serverId]);

        console.log(`Started monitoring for server ${serverId}`);
      } catch (error) {
        console.error('Error starting monitoring:', error);
      }
    },

    /**
     * Collect monitoring data for a server
     * @param {string} serverId - Server ID
     * @param {Object} data - Monitoring data
     */
    async recordMonitoringData(serverId, data) {
      try {
        await pool.query(`
          INSERT INTO vps_monitoring (
            server_id, cpu_usage, memory_usage, disk_usage,
            network_in, network_out, uptime, load_average
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          serverId,
          data.cpu_usage,
          data.memory_usage,
          data.disk_usage,
          data.network_in,
          data.network_out,
          data.uptime,
          data.load_average
        ]);
      } catch (error) {
        console.error('Error recording monitoring data:', error);
      }
    },

    /**
     * Get monitoring history for a server
     * @param {string} serverId - Server ID
     * @param {string} timeframe - Time range (1h, 24h, 7d, 30d)
     * @returns {Array} Monitoring data points
     */
    async getMonitoringHistory(serverId, timeframe = '24h') {
      try {
        const intervals = {
          '1h': '1 hour',
          '24h': '24 hours',
          '7d': '7 days',
          '30d': '30 days'
        };

        const interval = intervals[timeframe] || '24 hours';

        const result = await pool.query(`
          SELECT *
          FROM vps_monitoring
          WHERE server_id = $1
          AND recorded_at > now() - interval '${interval}'
          ORDER BY recorded_at ASC
        `, [serverId]);

        return result.rows;
      } catch (error) {
        console.error('Error getting monitoring history:', error);
        throw error;
      }
    },

    /**
     * Update server configuration
     * @param {string} serverId - Server ID
     * @param {string} userId - User ID
     * @param {Object} updates - Configuration updates
     * @returns {Object} Updated server
     */
    async updateServer(serverId, userId, updates) {
      try {
        const allowedFields = [
          'name', 'hostname', 'connection_config', 'monitoring_enabled', 'status'
        ];

        const setClause = [];
        const values = [];
        let paramIndex = 1;

        for (const [field, value] of Object.entries(updates)) {
          if (allowedFields.includes(field)) {
            setClause.push(`${field} = $${paramIndex}`);
            values.push(field === 'connection_config' ? JSON.stringify(value) : value);
            paramIndex++;
          }
        }

        if (setClause.length === 0) {
          throw new Error('No valid fields to update');
        }

        setClause.push(`updated_at = now()`);
        values.push(serverId, userId);

        const query = `
          UPDATE vps_servers
          SET ${setClause.join(', ')}
          WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
          RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
          throw new Error('Server not found or access denied');
        }

        return result.rows[0];
      } catch (error) {
        console.error('Error updating server:', error);
        throw error;
      }
    },

    /**
     * Delete server
     * @param {string} serverId - Server ID
     * @param {string} userId - User ID
     * @returns {boolean} Success status
     */
    async deleteServer(serverId, userId) {
      try {
        const result = await pool.query(`
          DELETE FROM vps_servers
          WHERE id = $1 AND user_id = $2
          RETURNING id
        `, [serverId, userId]);

        return result.rowCount > 0;
      } catch (error) {
        console.error('Error deleting server:', error);
        throw error;
      }
    },

    /**
     * Bulk deploy to multiple servers
     * @param {Array} serverIds - Array of server IDs
     * @param {string} userId - User ID
     * @param {string} scriptType - Type of script to deploy
     * @param {Object} environment - Environment variables
     * @returns {Array} Deployment results
     */
    async bulkDeploy(serverIds, userId, scriptType, environment = {}) {
      const results = [];

      for (const serverId of serverIds) {
        try {
          const result = await this.deployScript(serverId, userId, scriptType, environment);
          results.push({ serverId, success: true, result });
        } catch (error) {
          results.push({ 
            serverId, 
            success: false, 
            error: error.message 
          });
        }
      }

      return results;
    }
    ,
    /**
     * Fetch and stage a learning corpus on the remote VPS for agent training/analysis.
     * This clones specified repositories to a temporary path, extracts only safe artifacts
     * (e.g., n8n workflow JSONs and node sources, markdown/docs), copies them into an
     * isolated directory, applies restrictive permissions, and runs a static scan.
     *
     * @param {string} serverId
     * @param {string} userId
     * @param {Object} options
     * @param {string} [options.targetDir=/opt/learning_corpus]
     * @param {Array<Object>} [options.sources] - List of { url, type='git', include=[], exclude=[], destSubdir }
     * @returns {Object} summary including paths and scan results
     */
  async stageLearningCorpus(serverId, userId, options = {}) {
      // Resolve server
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

  const targetDir = options.targetDir || '/opt/docniz_corpus';
  const makeImmutable = options.makeImmutable === true; // optional extra hardening with chattr +i
      // Defaults are conservative; user can pass explicit corpora
      const defaultSources = [
        // n8n nodes (official)
        { url: 'https://github.com/n8n-io/n8n.git', type: 'git', destSubdir: 'n8n/nodes', include: ['packages/**/nodes/**', 'packages/**/credentials/**', 'packages/**/docs/**'], exclude: ['**/dist/**','**/node_modules/**','.git/**'] },
        // n8n community nodes
        { url: 'https://github.com/n8n-io/n8n-community-nodes.git', type: 'git', destSubdir: 'n8n/community-nodes', include: ['**/*'], exclude: ['**/node_modules/**','.git/**','**/dist/**'] },
        // WordPress Plugin Boilerplate
        { url: 'https://github.com/DevinVinson/WordPress-Plugin-Boilerplate.git', type: 'git', destSubdir: 'wordpress/plugin-boilerplate', include: ['**/*.md','**/*.php','**/*.txt'], exclude: ['.git/**'] },
        // WordPress101
        { url: 'https://github.com/Alecaddd/WordPress101.git', type: 'git', destSubdir: 'wordpress/wordpress101', include: ['**/*.md','**/*.php','**/*.txt'], exclude: ['.git/**'] },
        // Postiz docs
        { url: 'https://github.com/gitroomhq/postiz-docs.git', type: 'git', destSubdir: 'postiz/docs', include: ['**/*.md','**/*.yml','**/*.yaml'], exclude: ['.git/**'] }
        // NOTE: For large n8n workflow corpora, pass an explicit source pointing to your JSON set:
        // { url: 'https://github.com/<you>/<n8n-workflows-corpus>.git', type: 'git', destSubdir: 'n8n/workflows', include: ['**/*.json'], exclude: ['.git/**'] }
      ];
      const sources = Array.isArray(options.sources) && options.sources.length ? options.sources : defaultSources;

      // Build remote bash script
  const script = `#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

TARGET_DIR='${targetDir}'
TMP_BASE="/tmp/corpus_$(date +%s)_$$"
mkdir -p "$TMP_BASE"

echo "[info] Ensuring git is installed..."
if ! command -v git >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then sudo apt-get update -y && sudo apt-get install -y git; fi
fi

echo "[info] Preparing target directories at $TARGET_DIR"
sudo mkdir -p "$TARGET_DIR" "$TARGET_DIR/_scan"
sudo chown -R $(whoami):$(whoami) "$TARGET_DIR"

fetch_git() {
  local url="$1"; local dest="$2";
  echo "[info] Cloning $url -> $dest"
  git clone --depth=1 "$url" "$dest" 2>&1
}

copy_includes() {
  local src="$1"; shift
  local dest="$1"; shift
  mkdir -p "$dest"
  # Remaining args are patterns to include (newline-separated list via heredoc)
  local patterns_file="$TMP_BASE/patterns.txt"
  cat > "$patterns_file" <<'PATTERNS_EOF'
${(sources.map(s => (Array.isArray(s.include) ? s.include : ['**/*']).join('\n'))).join('\n')}
PATTERNS_EOF
  while IFS= read -r pat; do
    [ -z "$pat" ] && continue
    # Use shopt to enable globstar for **
    ( shopt -s globstar dotglob nullglob; for f in $src/$pat; do
        [ -e "$f" ] || continue
        # Skip if excluded
        :
      done )
  done < "$patterns_file"
}

# We will process each source discretely to honor its own include/exclude lists
REPORT="$TARGET_DIR/_scan/report.txt"
echo "Learning Corpus Scan Report $(date -Iseconds)" > "$REPORT"
echo "Target: $TARGET_DIR" >> "$REPORT"
echo "---" >> "$REPORT"

json_count=0; node_count=0; md_count=0; php_count=0

` + sources.map((s, idx) => {
        const srcDir = `${'${TMP_BASE}'}/src_${idx}`;
        // Build include/exclude parts
        const includeFinds = (Array.isArray(s.include) && s.include.length ? s.include : ['**/*'])
          .map(p => p.replace(/"/g, '\\"'));
        const excludePrunes = (Array.isArray(s.exclude) && s.exclude.length ? s.exclude : [])
          .map(p => p.replace(/"/g, '\\"'));
        const dest = `${'${TARGET_DIR}'}/${s.destSubdir || ('repo_' + idx)}`;
        return `
echo "[info] Processing ${s.url} -> ${dest}"
fetch_git "${s.url}" "${srcDir}"
mkdir -p "${dest}"
# Copy by include patterns with rsync-style includes if available; fallback to find
if command -v rsync >/dev/null 2>&1; then
  RSYNC_ARGS=("-a" "--prune-empty-dirs")
  ${includeFinds.map(p => `RSYNC_ARGS+=("--include=${p}")`).join('\n  ')}
  ${excludePrunes.map(p => `RSYNC_ARGS+=("--exclude=${p}")`).join('\n  ')}
  RSYNC_ARGS+=("--exclude=*" "${srcDir}/" "${dest}/")
  rsync "${'${RSYNC_ARGS[@]}'}"
else
  ( shopt -s globstar dotglob nullglob; \
    for pat in ${includeFinds.map(p => `'${p}'`).join(' ')}; do \
      for f in ${srcDir}/$pat; do \
        [ -e "$f" ] || continue; \
        skip=0; \
        for ex in ${excludePrunes.map(p => `'${p}'`).join(' ')}; do \
          [[ "$f" == ${srcDir}/$ex ]] && skip=1 && break; \
        done; \
        [ $skip -eq 1 ] && continue; \
        if [ -d "$f" ]; then \
          mkdir -p "${dest}/$(realpath --relative-to="${srcDir}" "$f")"; \
        else \
          mkdir -p "${dest}/$(dirname "$(realpath --relative-to="${srcDir}" "$f")")"; \
          cp -p "$f" "${dest}/$(realpath --relative-to="${srcDir}" "$f")"; \
        fi; \
      done; \
    done )
fi

# Update counts
json_count=$(( json_count + $(find "${dest}" -type f -name '*.json' | wc -l || echo 0) ))
node_count=$(( node_count + $(find "${dest}" -type f -name '*.ts' -o -name '*.js' | wc -l || echo 0) ))
md_count=$(( md_count + $(find "${dest}" -type f -name '*.md' | wc -l || echo 0) ))
php_count=$(( php_count + $(find "${dest}" -type f -name '*.php' | wc -l || echo 0) ))
`;
      }).join('\n') + `

# Permissions: enforce read-only on corpus, but keep _scan writable for reports
find "$TARGET_DIR" -type d -not -path "$TARGET_DIR/_scan*" -exec chmod 0555 {} +
find "$TARGET_DIR" -type f -not -path "$TARGET_DIR/_scan/*" -exec chmod 0444 {} +
chmod 0755 "$TARGET_DIR/_scan" || true
find "$TARGET_DIR/_scan" -type f -exec chmod 0644 {} + || true

# Optional: immutable flag for extra protection (requires chattr on ext filesystems)
if command -v chattr >/dev/null 2>&1; then
  ${makeImmutable ? 'chattr -R +i "$TARGET_DIR" || true' : 'true'}
fi

echo "---" >> "$REPORT"
echo "Files: JSON=$json_count TS/JS=$node_count MD=$md_count PHP=$php_count" >> "$REPORT"

# Static scan for secrets/malicious patterns (best-effort, non-exec)
echo "[scan] Searching for suspicious patterns" >> "$REPORT"
grep -RInE "api[_-]?key|secret|password|token|eval\(|child_process|spawn\(|rm -rf|curl|wget|base64 -d|bash -c|sh -c|openssl enc" "$TARGET_DIR" 2>/dev/null | sed "s|$TARGET_DIR/||" >> "$REPORT" || true

# Summary JSON (also save to target dir)
REPORT_JSON="$TARGET_DIR/_scan/summary.json"
cat > "$REPORT_JSON" <<JSON_EOF
{\n  "targetDir": "${targetDir}",\n  "counts": {"json": $json_count, "code": $node_count, "md": $md_count, "php": $php_count},\n  "reportPath": "$REPORT"\n}
JSON_EOF

echo "[info] Corpus staged at $TARGET_DIR"
# Emit a machine-parsable block with the JSON summary
echo "JSON_SUMMARY_START"
cat "$REPORT_JSON"
echo "JSON_SUMMARY_END"
`;

      // Execute remote and retrieve JSON report
      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();
      const logs = await ssh.exec(script);
      let summary = { logs };
      // Parse JSON between markers
      try {
        const text = String(logs);
        const start = text.indexOf('JSON_SUMMARY_START');
        const end = text.indexOf('JSON_SUMMARY_END');
        if (start !== -1 && end !== -1 && end > start) {
          const jsonStr = text.substring(start + 'JSON_SUMMARY_START'.length, end).trim();
          summary = { ...summary, ...JSON.parse(jsonStr) };
        }
      } catch (e) {
        // ignore parsing issues; caller still receives logs
      }
      await ssh.close();
      return { success: true, ...summary };
    },

    /**
     * Create a tar.gz snapshot of the corpus for offline availability
     */
    async snapshotLearningCorpus(serverId, userId, targetDir = '/opt/docniz_corpus') {
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();
      const snapshotPath = `${targetDir}/_scan/corpus-$(date +%Y%m%d-%H%M%S).tar.gz`;
      const cmd = `set -e; mkdir -p ${targetDir}/_scan; tar --exclude='${targetDir}/_scan/*.tar.gz' -czf ${snapshotPath} -C ${targetDir} . && echo ${snapshotPath}`;
      const out = await ssh.exec(cmd);
      await ssh.close();
      return { success: true, snapshot: String(out).trim() };
    },

    /**
     * Run only the static scan on an existing corpus directory
     */
    async analyzeLearningCorpus(serverId, userId, targetDir = '/opt/learning_corpus') {
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

      const script = `#!/usr/bin/env bash\nset -euo pipefail\nREPORT=\"${targetDir}/_scan/report.txt\"\n[ -f \"$REPORT\" ] || touch \"$REPORT\"\necho \"--- Rescan $(date -Iseconds) ---\" >> \"$REPORT\"\ngrep -RInE \"api[_-]?key|secret|password|token|eval\\(|child_process|spawn\\(|rm -rf|curl|wget|base64 -d|bash -c|sh -c|openssl enc\" \"${targetDir}\" 2>/dev/null | sed \"s|${targetDir}/||\" >> \"$REPORT\" || true\nJSON=\"${targetDir}/_scan/summary.json\"\njson_count=$(find \"${targetDir}\" -type f -name '*.json' | wc -l || echo 0)\ncode_count=$(find \"${targetDir}\" -type f -name '*.ts' -o -name '*.js' | wc -l || echo 0)\nmd_count=$(find \"${targetDir}\" -type f -name '*.md' | wc -l || echo 0)\nphp_count=$(find \"${targetDir}\" -type f -name '*.php' | wc -l || echo 0)\ncat > \"$JSON\" <<JSON_EOF\n{\\n  \\\"targetDir\\\": \\\"${targetDir}\\\",\\n  \\\"counts\\\": {\\\"json\\\": $json_count, \\\"code\\\": $code_count, \\\"md\\\": $md_count, \\\"php\\\": $php_count},\\n  \\\"reportPath\\\": \\\"$REPORT\\\"\\n}\nJSON_EOF\necho OK`;

      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();
      const logs = await ssh.exec(script);
      await ssh.close();
      return { success: true, logs };
    },

    /**
     * List a summary of the corpus directory tree and counts
     */
    async listLearningCorpus(serverId, userId, targetDir = '/opt/learning_corpus') {
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();
      const treeCmd = `set -e; command -v tree >/dev/null 2>&1 || (sudo apt-get update -y && sudo apt-get install -y tree >/dev/null 2>&1 || true); tree -a -L 2 ${targetDir} 2>/dev/null || ls -la ${targetDir}`;
      const tree = await ssh.exec(treeCmd);
      const countsCmd = `json=$(find ${targetDir} -type f -name '*.json' | wc -l || echo 0); code=$(find ${targetDir} -type f -name '*.ts' -o -name '*.js' | wc -l || echo 0); md=$(find ${targetDir} -type f -name '*.md' | wc -l || echo 0); php=$(find ${targetDir} -type f -name '*.php' | wc -l || echo 0); echo "$json $code $md $php"`;
      const countsOut = await ssh.exec(countsCmd);
      await ssh.close();
      const [jsonC, codeC, mdC, phpC] = String(countsOut).trim().split(/\s+/).map(n => parseInt(n || '0', 10));
      return { success: true, tree, counts: { json: jsonC, code: codeC, md: mdC, php: phpC }, targetDir };
    }
    ,
    /**
     * Refresh the n8n whitelist: update whitelist-domains.txt and run whitelist-domains.sh
     * @param {string} serverId
     * @param {string} userId
     * @param {Array<string>} whitelistDomains
     * @returns {Object} { success, logs, paths }
     */
    async refreshN8nWhitelist(serverId, userId, whitelistDomains = []) {
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

      const sandboxRoot = '/opt/n8n_sandbox';
      const wlFile = `${sandboxRoot}/whitelist-domains.txt`;
      const wlScript = `${sandboxRoot}/whitelist-domains.sh`;

      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();

      // Ensure directory and update file
      const domainsStr = Array.isArray(whitelistDomains) ? whitelistDomains.join('\n') : String(whitelistDomains || '');
      await ssh.exec(`sudo mkdir -p ${sandboxRoot} && sudo touch ${wlFile} && cat > ${wlFile} <<'EOF'\n${domainsStr}\nEOF`);

      // Execute refresh script if present
      let logs = '';
      try {
        logs = await ssh.exec(`bash ${wlScript} 2>&1`);
      } catch (e) {
        logs = `whitelist-domains.sh not found or failed. ${e.message}`;
      }
      await ssh.close();

      return { success: true, logs, paths: { whitelistFile: wlFile, whitelistScript: wlScript } };
    }
    ,
    /**
     * Install or update a systemd service+timer to refresh the n8n whitelist hourly (or custom OnCalendar).
     * @param {string} serverId
     * @param {string} userId
     * @param {Object} options { onCalendar?: string }
     * @returns {Object} { success, service, timer }
     */
    async installN8nWhitelistTimer(serverId, userId, options = {}) {
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

      const sandboxRoot = '/opt/n8n_sandbox';
      const wlScript = `${sandboxRoot}/whitelist-domains.sh`;
      const servicePath = '/etc/systemd/system/n8n-wl-refresh.service';
      const timerPath = '/etc/systemd/system/n8n-wl-refresh.timer';
      const onCalendar = options.onCalendar || 'hourly';

      const serviceContent = `[Unit]\nDescription=Refresh n8n egress whitelist IP sets\nAfter=network.target docker.service\n\n[Service]\nType=oneshot\nExecStart=/bin/bash ${wlScript}\nUser=root\nGroup=root\nNice=10\n\n[Install]\nWantedBy=multi-user.target\n`;
      const timerContent = `[Unit]\nDescription=Timer for n8n whitelist refresh\n\n[Timer]\nOnCalendar=${onCalendar}\nPersistent=true\nUnit=n8n-wl-refresh.service\n\n[Install]\nWantedBy=timers.target\n`;

      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();
      await ssh.exec(`sudo test -f ${wlScript} || (echo 'Whitelist script missing at ${wlScript}' && exit 1)`);
      await ssh.exec(`cat > ${servicePath} <<'EOF'\n${serviceContent}\nEOF`);
      await ssh.exec(`cat > ${timerPath} <<'EOF'\n${timerContent}\nEOF`);
      await ssh.exec(`sudo systemctl daemon-reload && sudo systemctl enable --now n8n-wl-refresh.timer`);
      await ssh.close();

      return { success: true, service: servicePath, timer: timerPath, schedule: onCalendar };
    }
    ,
    /**
     * Provision a hardened, isolated n8n sandbox on the remote VPS.
     * It installs a docker-compose stack bound to localhost (proxied via Nginx),
     * creates a private Docker subnet, applies egress whitelist firewall (ipset/iptables),
     * and prepares data and seed directories. It also creates helper scripts for
     * managing the whitelist and seeding workflows through the n8n REST API.
     *
     * @param {string} serverId
     * @param {string} userId
     * @param {Object} options
     * @param {string} [options.domain] Public domain for Nginx TLS proxy (e.g., n8n.example.com)
     * @param {string[]} [options.agentIPs=[]] Public IPs allowed to access the proxy (allow-list). If empty, deny all except localhost.
     * @param {string[]} [options.whitelistDomains=[]] Domains n8n is allowed to call outbound; empty means no outbound except DNS (if rules applied).
     * @param {boolean} [options.applyNginx=true] Whether to install and configure Nginx reverse proxy
     * @param {boolean} [options.applyEgressLockdown=true] Whether to apply DOCKER-USER iptables+ipset egress lockdown
     * @param {boolean} [options.applyAppArmor=false] Whether to install AppArmor profile and attach
     * @param {boolean} [options.start=true] Whether to start the compose stack immediately
     * @returns {Object} summary with paths, commands, and notes
     */
    async setupN8nSandbox(serverId, userId, options = {}) {
      const serverResult = await pool.query(`
        SELECT * FROM vps_servers WHERE id = $1 AND user_id = $2
      `, [serverId, userId]);
      if (serverResult.rows.length === 0) throw new Error('Server not found');
      const server = serverResult.rows[0];

      const domain = options.domain || '';
      const agentIPs = Array.isArray(options.agentIPs) ? options.agentIPs : [];
      const whitelistDomains = Array.isArray(options.whitelistDomains) ? options.whitelistDomains : [];
      const applyNginx = options.applyNginx !== false; // default true
      const applyEgress = options.applyEgressLockdown !== false; // default true
      const applyAppArmor = options.applyAppArmor === true;
      const startStack = options.start !== false; // default true

      // Constants/paths on remote host
      const sandboxRoot = '/opt/n8n_sandbox';
      const dataDir = '/srv/n8n_data';
      const seedDir = '/srv/n8n_seed_workflows';
      const composePath = `${sandboxRoot}/docker-compose.yml`;
      const envPath = `${sandboxRoot}/.env`;
      const wlFile = `${sandboxRoot}/whitelist-domains.txt`;
      const wlScript = `${sandboxRoot}/whitelist-domains.sh`;
      const egressScript = `${sandboxRoot}/egress-lockdown.sh`;
      const appArmorProfilePath = '/etc/apparmor.d/n8n-restrict';
  // Nginx site paths (used only when applyNginx && domain)
      // const nginxSitePath = '/etc/nginx/sites-available/n8n';
      // const nginxSiteEnable = '/etc/nginx/sites-enabled/n8n';

      // Render helper content
      const composeContent = `version: "3.8"\n\nnetworks:\n  n8n_net:\n    driver: bridge\n    ipam:\n      config:\n        - subnet: 172.23.0.0/24\n\nservices:\n  n8n:\n    image: n8nio/n8n:latest\n    container_name: n8n_sandbox\n    restart: unless-stopped\n    user: "1001:1001"\n    environment:\n      - TZ=UTC\n      - N8N_ENCRYPTION_KEY=\${N8N_ENCRYPTION_KEY}\n      - N8N_BLOCK_ENV_ACCESS_IN_NODE_FUNCTIONS=true\n      - NODE_FUNCTION_ALLOW_EXTERNAL=\n      - NODE_FUNCTION_ALLOW_BUILTIN=Buffer,crypto,setImmediate,setTimeout,clearTimeout\n    dns:\n      - 1.1.1.1\n      - 1.0.0.1\n    # Bind to localhost only; Nginx will proxy it if enabled\n    ports:\n      - "127.0.0.1:5678:5678"\n    networks: [n8n_net]\n    volumes:\n      - ${dataDir}:/home/node/.n8n:rw\n    read_only: true\n    tmpfs:\n      - /tmp\n      - /home/node/.cache\n    security_opt:\n      - no-new-privileges:true\n${applyAppArmor ? '      - apparmor=n8n-restrict\n' : ''}    cap_drop: [ALL]\n    pids_limit: 256\n    ulimits:\n      nproc: 256\n      nofile: { soft: 4096, hard: 8192 }\n`;

  const wlScriptContent = `#!/usr/bin/env bash\nset -euo pipefail\nWL_FILE="${wlFile}"\nSET4="n8n_allowed_egress4"\nSET6="n8n_allowed_egress6"\n\nsudo ipset list $SET4 &>/dev/null || sudo ipset create $SET4 hash:ip family inet timeout 3600\nsudo ipset list $SET6 &>/dev/null || sudo ipset create $SET6 hash:ip family inet6 timeout 3600\nsudo ipset flush $SET4 || true\nsudo ipset flush $SET6 || true\n\ncommand -v dig >/dev/null 2>&1 || (sudo apt-get update -y && sudo apt-get install -y dnsutils >/dev/null 2>&1)\n\nwhile IFS= read -r domain; do\n  domain="\${domain%%#*}"; domain="$(echo -n \"$domain\" | xargs)"\n  [[ -z "$domain" ]] && continue\n  for ip in $(dig +short A "$domain"); do sudo ipset add $SET4 "$ip" timeout 3600 || true; done\n  for ip in $(dig +short AAAA "$domain"); do sudo ipset add $SET6 "$ip" timeout 3600 || true; done\ndone < "$WL_FILE"\n\necho "Loaded whitelist:"\nsudo ipset list $SET4 | sed 's/^/  /'\nsudo ipset list $SET6 | sed 's/^/  /'\n`;

      const egressScriptContent = `#!/usr/bin/env bash\nset -euo pipefail\nsudo apt-get update -y\nsudo apt-get install -y iptables ipset >/dev/null 2>&1 || true\n\n# Allow established\nsudo iptables -C DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN 2>/dev/null || \\\n sudo iptables -I DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN\n\n# Allow DNS to Cloudflare from n8n subnet\nsudo iptables -C DOCKER-USER -s 172.23.0.0/24 -p udp --dport 53 -d 1.1.1.1 -j RETURN 2>/dev/null || \\\n sudo iptables -I DOCKER-USER -s 172.23.0.0/24 -p udp --dport 53 -d 1.1.1.1 -j RETURN\nsudo iptables -C DOCKER-USER -s 172.23.0.0/24 -p tcp --dport 53 -d 1.1.1.1 -j RETURN 2>/dev/null || \\\n sudo iptables -I DOCKER-USER -s 172.23.0.0/24 -p tcp --dport 53 -d 1.1.1.1 -j RETURN\nsudo iptables -C DOCKER-USER -s 172.23.0.0/24 -p udp --dport 53 -d 1.0.0.1 -j RETURN 2>/dev/null || \\\n sudo iptables -I DOCKER-USER -s 172.23.0.0/24 -p udp --dport 53 -d 1.0.0.1 -j RETURN\nsudo iptables -C DOCKER-USER -s 172.23.0.0/24 -p tcp --dport 53 -d 1.0.0.1 -j RETURN 2>/dev/null || \\\n sudo iptables -I DOCKER-USER -s 172.23.0.0/24 -p tcp --dport 53 -d 1.0.0.1 -j RETURN\n\n# Ensure ipsets exist\nsudo ipset list n8n_allowed_egress4 &>/dev/null || sudo ipset create n8n_allowed_egress4 hash:ip family inet timeout 3600\nsudo ipset list n8n_allowed_egress6 &>/dev/null || sudo ipset create n8n_allowed_egress6 hash:ip family inet6 timeout 3600\n\n# Allow whitelist ipsets\nsudo iptables -C DOCKER-USER -s 172.23.0.0/24 -m set --match-set n8n_allowed_egress4 dst -j RETURN 2>/dev/null || \\\n sudo iptables -I DOCKER-USER -s 172.23.0.0/24 -m set --match-set n8n_allowed_egress4 dst -j RETURN\n\n# Default drop for that subnet\nsudo iptables -C DOCKER-USER -s 172.23.0.0/24 -j DROP 2>/dev/null || \\\n sudo iptables -A DOCKER-USER -s 172.23.0.0/24 -j DROP\n\necho "IPv4 egress lockdown configured for 172.23.0.0/24"\n`;

      const appArmorProfile = `#include <tunables/global>\n\nprofile n8n-restrict flags=(attach_disconnected) {\n  file,\n  deny /** mrwklx,\n  /srv/n8n_data/** rwk,\n  /tmp/** rwk,\n  owner /home/node/.cache/** rwk,\n  /bin/** rix,\n  /usr/bin/** rix,\n  /lib/** r,\n  /lib64/** r,\n  /usr/lib/** r,\n  network inet,\n  capability,\n}\n`;

      const nginxConfig = (!applyNginx || !domain) ? '' : `server {\n    listen 80;\n    server_name ${domain};\n    return 301 https://$host$request_uri;\n}\n\nserver {\n    listen 443 ssl http2;\n    server_name ${domain};\n\n    ssl_certificate     /etc/letsencrypt/live/${domain}/fullchain.pem;\n    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;\n\n${agentIPs.map(ip => `    allow ${ip};\n`).join('') || '    # allow <YOUR_AGENT_IP>;\n'}    deny all;\n\n    auth_basic "Protected";\n    auth_basic_user_file /etc/nginx/.htpasswd_n8n;\n\n    add_header X-Frame-Options DENY;\n    add_header X-Content-Type-Options nosniff;\n    add_header Referrer-Policy no-referrer;\n\n    limit_req_zone $binary_remote_addr zone=n8napi:10m rate=10r/s;\n    location / {\n        limit_req zone=n8napi burst=20 nodelay;\n        proxy_pass http://127.0.0.1:5678;\n        proxy_set_header Host $host;\n        proxy_set_header X-Forwarded-For $remote_addr;\n        proxy_set_header X-Forwarded-Proto https;\n        proxy_read_timeout 300;\n    }\n}\n`;

      const seedScript = `#!/usr/bin/env bash\nset -euo pipefail\nBASE_URL="${domain ? `https://${domain}` : 'http://127.0.0.1:5678'}"\nPAT="${options.pat || '<N8N_PAT>'}"\nSEED_DIR="${seedDir}"\n\nshopt -s nullglob\nfor f in "$SEED_DIR"/*.json; do\n  echo "[seed] Importing $f"\n  curl -sSL -X POST -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \\\n    --data-binary @"$f" "$BASE_URL/rest/workflows" | sed 's/.*/  &/' || true\ndone\necho "[seed] Done."\n`;

      const ssh = new SSH2Promise({
        host: server.ip_address,
        port: server.connection_config?.ssh?.port || 22,
        username: server.connection_config?.ssh?.username || 'root',
        ...server.connection_config?.ssh
      });
      await ssh.connect();

      // Ensure required packages and folders
      const setupCmd = `set -e\n\n# Directories\nsudo mkdir -p ${sandboxRoot} ${dataDir} ${seedDir}\nsudo chown -R 1001:1001 ${dataDir} || true\n\n# Docker + compose plugin\nif ! command -v docker >/dev/null 2>&1; then\n  if command -v apt-get >/dev/null 2>&1; then\n    sudo apt-get update -y && sudo apt-get install -y docker.io docker-compose-plugin\n    sudo systemctl enable --now docker\n  fi\nfi\n\n# Nginx if needed\n${applyNginx ? 'if ! command -v nginx >/dev/null 2>&1; then sudo apt-get update -y && sudo apt-get install -y nginx apache2-utils; fi' : 'true'}\n\n# .env with encryption key\nif [ ! -f ${envPath} ]; then\n  KEY=$(openssl rand -hex 32); echo "N8N_ENCRYPTION_KEY=$KEY" | sudo tee ${envPath} >/dev/null\nfi\n`;
      await ssh.exec(setupCmd);

      // Write files via heredocs
      await ssh.exec(`cat > ${composePath} <<'EOF'\n${composeContent}\nEOF`);
      await ssh.exec(`cat > ${wlFile} <<'EOF'\n${(whitelistDomains || []).join('\n')}\nEOF`);
      await ssh.exec(`cat > ${wlScript} <<'EOF'\n${wlScriptContent}\nEOF && chmod +x ${wlScript}`);
      if (applyEgress) {
        await ssh.exec(`cat > ${egressScript} <<'EOF'\n${egressScriptContent}\nEOF && chmod +x ${egressScript}`);
      }
      if (applyAppArmor) {
        await ssh.exec(`cat > ${appArmorProfilePath} <<'EOF'\n${appArmorProfile}\nEOF && sudo apparmor_parser -r ${appArmorProfilePath} || true`);
      }
      if (applyNginx && domain) {
        await ssh.exec(`cat > /etc/nginx/sites-available/n8n <<'EOF'\n${nginxConfig}\nEOF`);
        await ssh.exec(`ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/n8n || true`);
        // Create basic auth file placeholder if missing
        await ssh.exec(`[ -f /etc/nginx/.htpasswd_n8n ] || (echo 'admin:$apr1$9no9b3n.$9M6e3JmF0m1gFr0N7pP7V0' | sudo tee /etc/nginx/.htpasswd_n8n >/dev/null)`);
        await ssh.exec(`nginx -t && sudo systemctl reload nginx || true`);
      }

      // Apply firewall and whitelist, then start stack
      let combinedLogs = '';
      if (applyEgress) {
        combinedLogs += await ssh.exec(`bash ${egressScript} 2>&1 || true`);
        combinedLogs += '\n';
        combinedLogs += await ssh.exec(`bash ${wlScript} 2>&1 || true`);
      }
      // Seed helper
      await ssh.exec(`cat > ${sandboxRoot}/seed-workflows.sh <<'EOF'\n${seedScript}\nEOF && chmod +x ${sandboxRoot}/seed-workflows.sh`);

      if (startStack) {
        combinedLogs += '\n' + await ssh.exec(`cd ${sandboxRoot} && docker compose --env-file ${envPath} up -d 2>&1 || true`);
      }

      await ssh.close();

  const result = {
        success: true,
        paths: {
          sandboxRoot,
          composePath,
          envPath,
          dataDir,
          seedDir,
          whitelistFile: wlFile,
          whitelistScript: wlScript,
          egressScript: applyEgress ? egressScript : null,
          appArmorProfile: applyAppArmor ? appArmorProfilePath : null,
          nginxSite: applyNginx && domain ? '/etc/nginx/sites-available/n8n' : null
        },
        api: {
          baseUrl: domain ? `https://${domain}` : 'http://127.0.0.1:5678',
          auth: 'Use n8n Personal Access Token (PAT) in Authorization: Bearer <PAT>'
        },
        uploadInstruction: `Upload your zipped workflows to ${seedDir} on the VPS and extract them there (JSON files). Then run: sudo ${sandboxRoot}/seed-workflows.sh`,
        notes: {
          access: domain ? `Proxy is restricted to: ${agentIPs.length ? agentIPs.join(', ') : 'no IPs allowed (update Nginx allow list)'}.` : 'No public exposure; bound to localhost:5678.',
          egress: applyEgress ? 'Egress locked to whitelist + DNS only (Cloudflare). Update whitelist and re-run whitelist-domains.sh to refresh.' : 'Egress lockdown skipped.',
          apparmor: applyAppArmor ? 'AppArmor profile loaded and attached.' : 'AppArmor not applied.'
  },
  logs: combinedLogs
      };

      return result;
    }
  };
}

