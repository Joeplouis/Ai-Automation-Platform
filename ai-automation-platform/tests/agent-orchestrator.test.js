import { createAgentOrchestrator } from '../src/ai/agent-orchestrator.js';

describe('Agent Orchestrator', () => {
  test('registers and lists agents', () => {
    const orch = createAgentOrchestrator();
    orch.registerAgent({ id: 'a1', type: 'llm', capabilities: ['chat'], execute: async () => ({ result: 'ok' }) });
    const agents = orch.listAgents();
    expect(agents.find(a => a.id === 'a1')).toBeTruthy();
  });

  test('routes task to capable agent', async () => {
    const orch = createAgentOrchestrator({ maxAttempts: 1 });
    orch.registerAgent({ id: 'a1', type: 'llm', capabilities: ['chat'], execute: async () => ({ result: 'hi' }) });
    const res = await orch.routeTask({ type: 'chat', input: 'hello' });
    expect(res.status).toBe('completed');
    expect(res.agent).toBe('a1');
    expect(res.result.result || res.result).toBeDefined();
  });

  test('fails over to second agent', async () => {
    const orch = createAgentOrchestrator({ maxAttempts: 2 });
    orch.registerAgent({ id: 'bad', type: 'llm', capabilities: ['chat'], execute: async () => { throw new Error('boom'); } });
    orch.registerAgent({ id: 'good', type: 'llm', capabilities: ['chat'], execute: async () => ({ result: 'rescued' }) });
    const res = await orch.routeTask({ type: 'chat', input: 'x' });
    expect(res.status).toBe('completed');
    expect(res.agent).toBe('good');
    expect(res.tried.length).toBeGreaterThan(1);
  });

  test('no agent case', async () => {
    const orch = createAgentOrchestrator();
    const res = await orch.routeTask({ type: 'missing' }).catch(e => e);
    // routeTask throws only for malformed task; with type it returns no_agent
    expect(res.status).toBe('no_agent');
  });

  test('timeout handling', async () => {
    const orch = createAgentOrchestrator({ maxAttempts: 1, taskTimeoutMs: 50 });
    orch.registerAgent({ id: 'slow', type: 'llm', capabilities: ['chat'], execute: () => new Promise(r => setTimeout(() => r({ result: 'late' }), 200)) });
    const res = await orch.routeTask({ type: 'chat' });
    expect(res.status).toBe('failed');
    expect(res.tried[0].outcome).toBe('timeout');
  });
});
