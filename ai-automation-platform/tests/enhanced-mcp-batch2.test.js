import { EnhancedAIAutomationMCPServer } from '../src/core/enhanced-mcp-server.js';

// Smoke tests for Batch 2 mutation/action handlers (non-network side effects minimized)

describe('Enhanced MCP Batch 2 mutation tools', () => {
  let server;
  beforeAll(() => {
    server = new EnhancedAIAutomationMCPServer();
  });

  test('tool list includes ai_chat', async () => {
    const list = await server.listTools?.();
    const names = list?.tools?.map(t => t.name) || [];
    expect(names).toContain('ai_chat');
  });

  test('ai_generate_workflow tool listed', async () => {
    const list = await server.listTools?.();
    const names = list?.tools?.map(t => t.name) || [];
    expect(names).toContain('ai_generate_workflow');
  });
});
