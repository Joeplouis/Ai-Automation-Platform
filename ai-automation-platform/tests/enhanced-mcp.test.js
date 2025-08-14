import { EnhancedAIAutomationMCPServer } from '../src/core/enhanced-mcp-server.js';

// Minimal test just ensures tool list includes expected entries

describe('Enhanced MCP Server', () => {
  test('lists base enhanced tools', async () => {
    const server = new EnhancedAIAutomationMCPServer();
    // Wait a tick for async init
    await new Promise(r => setTimeout(r, 50));
    const tools = await server.server.listTools();
    const names = tools.tools.map(t => t.name);
    expect(names).toEqual(expect.arrayContaining([
      'learning_stats','agent_list','workflow_score','content_generate_article',
      'review_list_pending','review_change_status','review_list_by_status','review_decide_batch'
    ]));
  });
});
