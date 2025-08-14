// Agent Orchestrator (Task 2.4)
// Intelligent routing & selection across registered agents with scoring, fallback & metrics.

import { initMetrics } from '../observability/metrics.js';

/**
 * Agent Shape (expected fields):
 * id: string
 * type: string (e.g. 'llm','workflow','content','analysis')
 * capabilities: string[] (task types handled)
 * execute(task): Promise<{ result, meta? }>
 * health?(): Promise<{ ok:boolean, latencyMs?:number }>
 */

export function createAgentOrchestrator(options = {}) {
  const agents = new Map();
  const metrics = initMetrics();
  // local metrics (Prometheus counters/histograms piggyback onto existing registry if desired later)
  let selectionCounter = metrics.agentSelections || null;
  let selectionDuration = metrics.agentTaskDuration || null;
  let selectionFailovers = metrics.agentFailovers || null;

  // Lazy-add custom metrics if not provisioned yet
  if (!selectionCounter) {
    try {
      // Use require if available (CommonJS interop) else fallback to import()
      // Avoid await inside non-async; metrics creation is best-effort.
      let promClient;
      try { /* eslint-disable global-require */ promClient = require('prom-client'); } catch { /* ignore */ }
      if (!promClient) {
        // dynamic import without awaiting (fire & forget) not ideal for sync registry addition; skip if unsupported
        // Return without custom metrics; base orchestrator still functions.
      } else {
        metrics.agentSelections = new promClient.Counter({
          name: 'ai_platform_agent_selections_total',
          help: 'Agent selection attempts',
          labelNames: ['strategy', 'outcome', 'agent']
        });
        metrics.agentTaskDuration = new promClient.Histogram({
          name: 'ai_platform_agent_task_duration_seconds',
          help: 'Duration of agent task execution',
          labelNames: ['agent', 'task_type', 'outcome'],
          buckets: [0.05,0.1,0.25,0.5,1,2,5,10]
        });
        metrics.agentFailovers = new promClient.Counter({
          name: 'ai_platform_agent_failovers_total',
          help: 'Number of failovers during routing',
          labelNames: ['initial_agent','final_agent','task_type']
        });
        selectionCounter = metrics.agentSelections;
        selectionDuration = metrics.agentTaskDuration;
        selectionFailovers = metrics.agentFailovers;
      }
    } catch (e) {
      // ignore metrics creation failure
    }
  }

  // Load weight overrides from ENV if present (comma-separated key=value)
  const envWeightStr = process.env.AGENT_SCORE_WEIGHTS || '';
  const envWeights = {};
  if (envWeightStr) {
    envWeightStr.split(',').map(p => p.trim()).filter(Boolean).forEach(pair => {
      const [k,v] = pair.split('=');
      const num = Number(v);
      if (k && !Number.isNaN(num)) envWeights[k] = num;
    });
  }
  const config = {
    strategy: options.strategy || process.env.AGENT_ORCHESTRATOR_STRATEGY || 'scored-capabilities',
    maxAttempts: options.maxAttempts || parseInt(process.env.AGENT_MAX_ATTEMPTS || '3',10),
    taskTimeoutMs: options.taskTimeoutMs || parseInt(process.env.AGENT_TASK_TIMEOUT_MS || '15000',10),
    scoreWeights: {
      capability: 4,
      successRate: 2,
      freshness: 1,
      load: 2,
      ...(options.scoreWeights || {}),
      ...envWeights
    },
    perTaskOverrides: options.perTaskOverrides || {}
  };

  function updateConfig(patch = {}) {
    if (patch.strategy) config.strategy = patch.strategy;
    if (patch.maxAttempts) config.maxAttempts = patch.maxAttempts;
    if (patch.taskTimeoutMs) config.taskTimeoutMs = patch.taskTimeoutMs;
    if (patch.scoreWeights) Object.assign(config.scoreWeights, patch.scoreWeights);
    if (patch.perTaskOverrides) Object.assign(config.perTaskOverrides, patch.perTaskOverrides);
    return config;
  }

  function registerAgent(agent) {
    if (!agent?.id) throw new Error('Agent must have id');
    const now = Date.now();
    const entry = agents.get(agent.id) || {};
    const merged = {
      id: agent.id,
      type: agent.type || 'generic',
      capabilities: agent.capabilities || [],
      execute: agent.execute,
      health: agent.health,
      stats: entry.stats || { successes: 0, failures: 0, lastLatencyMs: 0, inFlight: 0 },
      status: 'idle',
      lastSeen: new Date(now).toISOString()
    };
    agents.set(agent.id, merged);
    return { id: merged.id, type: merged.type, capabilities: merged.capabilities };
  }

  function listAgents() {
    return [...agents.values()].map(a => ({
      id: a.id,
      type: a.type,
      status: a.status,
      capabilities: a.capabilities,
      stats: a.stats
    }));
  }

  function getAgent(id) { return agents.get(id) || null; }

  function effectiveWeightsForTask(task) {
    if (!task?.type) return config.scoreWeights;
    const override = config.perTaskOverrides[task.type];
    if (!override) return config.scoreWeights;
    return { ...config.scoreWeights, ...(override.scoreWeights || {}) };
  }

  function computeScore(task, agent) {
    const w = config.scoreWeights;
    const hasCapability = agent.capabilities?.includes(task.type) ? 1 : 0;
    if (!hasCapability) return -1;
    const s = agent.stats || { successes:0, failures:0, inFlight:0 };
    const total = s.successes + s.failures;
    const successRate = total === 0 ? 0.5 : s.successes / total; // optimistic prior
    const freshnessMs = Date.now() - new Date(agent.lastSeen).getTime();
    const freshnessScore = Math.max(0, 1 - (freshnessMs / 60000)); // decays over 1 min
    const loadPenalty = s.inFlight > 0 ? 1 / (1 + s.inFlight) : 1; // more inFlight reduces score
    const score = hasCapability * w.capability + successRate * w.successRate + freshnessScore * w.freshness + loadPenalty * w.load;
    return score;
  }

  function rankAgents(task) {
    const taskWeights = effectiveWeightsForTask(task);
    const ranked = [...agents.values()]
      .map(a => ({ agent: a, score: computeScore({ ...task, _weights: taskWeights }, a) }))
      .filter(r => r.score >= 0)
      .sort((a,b) => b.score - a.score);
    return ranked;
  }

  async function withTimeout(promise, ms) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('task_timeout')), ms); })
    ]).finally(() => clearTimeout(timer));
  }

  async function routeTask(task) {
    if (!task || !task.type) throw new Error('Task must include type');
    const startSelect = Date.now();
    const ranked = rankAgents(task);
    if (!ranked.length) {
      if (selectionCounter) selectionCounter.inc({ strategy: config.strategy, outcome: 'no_agent', agent: 'none' });
      return { status: 'no_agent', message: 'No suitable agent found', task };
    }
    let attempts = 0;
    const tried = [];
    let finalResult = null;
    let initialAgentId = ranked[0].agent.id;
    for (const { agent, score } of ranked.slice(0, config.maxAttempts)) {
      attempts++;
      const attemptStart = Date.now();
      agent.status = 'busy';
      agent.stats.inFlight = (agent.stats.inFlight || 0) + 1;
      let outcome = 'success';
      let result, error;
      try {
        const execPromise = agent.execute ? agent.execute(task) : Promise.reject(new Error('no_execute_fn'));
        const wrapped = withTimeout(execPromise, config.taskTimeoutMs);
        const execRes = await wrapped;
        result = execRes?.result ?? execRes;
        if (execRes?.meta) result = { result, meta: execRes.meta };
        agent.stats.successes++;
        agent.stats.lastLatencyMs = Date.now() - attemptStart;
        finalResult = { status: 'completed', agent: agent.id, result, latencyMs: agent.stats.lastLatencyMs };
      } catch (e) {
        outcome = e.message === 'task_timeout' ? 'timeout' : 'error';
        agent.stats.failures++;
        error = { message: e.message, stack: e.stack };
      } finally {
        agent.stats.inFlight = Math.max(0, agent.stats.inFlight - 1);
        agent.status = 'idle';
        agent.lastSeen = new Date().toISOString();
        tried.push({ agentId: agent.id, score, outcome, latencyMs: Date.now() - attemptStart });
      }
      if (selectionCounter) selectionCounter.inc({ strategy: config.strategy, outcome, agent: agent.id });
      if (outcome === 'success') break; // stop on first success
    }
    if (!finalResult) {
      if (selectionCounter) selectionCounter.inc({ strategy: config.strategy, outcome: 'failed', agent: 'none' });
      return { status: 'failed', message: 'All candidate agents failed', task, tried };
    }
    if (tried.length > 1 && selectionFailovers) {
      const lastAgent = finalResult.agent;
      selectionFailovers.inc({ initial_agent: initialAgentId, final_agent: lastAgent, task_type: task.type });
    }
    if (selectionDuration) {
      const outcome = finalResult.status === 'completed' ? 'success' : 'failed';
      selectionDuration.observe({ agent: finalResult.agent, task_type: task.type, outcome }, (Date.now() - startSelect)/1000);
    }
    return { ...finalResult, tried };
  }

  return { registerAgent, listAgents, getAgent, routeTask, config, updateConfig };
}

export default createAgentOrchestrator;
