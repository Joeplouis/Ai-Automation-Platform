#!/usr/bin/env node
/**
 * CLI helper to register an external HTTP-backed agent with the orchestrator admin API.
 * Usage:
 *   node scripts/register-external-agent.js \
 *     --id external-writer \
 *     --capabilities content_article,ai_chat \
 *     --callback https://agent-host.example.com/execute \
 *     --admin-token <ADMIN_KMS_KEY> \
 *     --api http://localhost:8080
 */
import fetch from 'node-fetch';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i=0;i<args.length;i+=2){
    const k = args[i];
    const v = args[i+1];
    if (!k.startsWith('--')) continue;
    out[k.slice(2)] = v;
  }
  return out;
}

async function main() {
  const args = parseArgs();
  const id = args.id;
  const capsRaw = args.capabilities || '';
  const callback = args.callback;
  const adminToken = args['admin-token'];
  const api = args.api || 'http://localhost:8080';
  if (!id || !callback || !adminToken) {
    console.error('Missing required --id, --callback, or --admin-token');
    process.exit(1);
  }
  const caps = capsRaw.split(',').map(c=>c.trim()).filter(Boolean);
  const resp = await fetch(`${api}/admin/orchestrator/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken },
    body: JSON.stringify({ id, capabilities: caps, callback_url: callback })
  });
  if (!resp.ok) {
    console.error('Registration failed', resp.status, await resp.text());
    process.exit(1);
  }
  console.log('Registered agent:', await resp.json());
}

main().catch(e => { console.error(e); process.exit(1); });
