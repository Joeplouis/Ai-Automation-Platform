import { createAgentOrchestrator } from '../src/ai/agent-orchestrator.js';

// Simple test harness (Jest assumed)

describe('Agent Orchestrator configuration & overrides', () => {
  const ORIGINAL_ENV = { ...process.env };
  afterEach(() => { process.env = { ...ORIGINAL_ENV }; });

  test('env weight parsing overrides defaults', () => {
    process.env.AGENT_SCORE_WEIGHTS = 'capability=10,successRate=5';
    const orch = createAgentOrchestrator();
    expect(orch.config.scoreWeights.capability).toBe(10);
    expect(orch.config.scoreWeights.successRate).toBe(5);
    // unchanged ones remain baseline
    expect(orch.config.scoreWeights.freshness).toBeGreaterThan(0);
  });

  test('per-task override precedence applies modified weight', async () => {
    const orch = createAgentOrchestrator({
      perTaskOverrides: {
        special_task: { scoreWeights: { capability: 99 } }
      }
    });
    // Register two agents: one with capability, one without
    orch.registerAgent({ id: 'A', capabilities: ['special_task'], execute: async () => ({ result: 'A' }) });
    orch.registerAgent({ id: 'B', capabilities: ['other_task'], execute: async () => ({ result: 'B' }) });
    const result = await orch.routeTask({ type: 'special_task' });
    expect(result.agent).toBe('A');
  });
});
