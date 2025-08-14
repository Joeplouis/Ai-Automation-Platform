import client from 'prom-client';

// Metrics (Task 1.15)
// Exposes default process metrics plus custom API & AI output metrics.

let registered = false;
let metrics = {};

export function initMetrics() {
  if (registered) return metrics;
  client.collectDefaultMetrics({ prefix: 'ai_platform_' });
  metrics.httpRequests = new client.Counter({
    name: 'ai_platform_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status']
  });
  metrics.httpDuration = new client.Histogram({
    name: 'ai_platform_http_request_duration_seconds',
    help: 'Request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05,0.1,0.25,0.5,1,2,5]
  });
  metrics.aiOutputs = new client.Counter({
    name: 'ai_platform_ai_outputs_total',
    help: 'AI outputs captured',
    labelNames: ['auto_escalated']
  });
  metrics.mcpToolInvocations = new client.Counter({
    name: 'ai_platform_mcp_tool_invocations_total',
    help: 'MCP tool invocations',
    labelNames: ['tool', 'server']
  });
  registered = true;
  return metrics;
}

export function metricsMiddleware() {
  initMetrics();
  return function (req, res, next) {
    const start = process.hrtime.bigint();
    const route = req.route?.path || req.path;
    res.on('finish', () => {
      const dur = Number(process.hrtime.bigint() - start) / 1e9;
      metrics.httpRequests.inc({ method: req.method, route, status: String(res.statusCode) });
      metrics.httpDuration.observe({ method: req.method, route, status: String(res.statusCode) }, dur);
    });
    next();
  };
}

export async function renderMetrics() {
  return await client.register.metrics();
}

export function incAIOutputs({ autoEscalated }) {
  initMetrics();
  metrics.aiOutputs.inc({ auto_escalated: autoEscalated ? 'true' : 'false' });
}

export function incMcpToolInvocation({ tool, server }) {
  initMetrics();
  metrics.mcpToolInvocations.inc({ tool, server });
}
