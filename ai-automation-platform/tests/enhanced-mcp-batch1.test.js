import { EnhancedAIAutomationMCPServer } from '../src/core/enhanced-mcp-server.js';

// Simple smoke tests for newly added Batch 1 tools

describe('Enhanced MCP Batch 1 listing tools', () => {
  let server;

  beforeAll(async () => {
    server = new EnhancedAIAutomationMCPServer();
    // we don't actually connect stdio transport for these internal handler invocations
  });

  test('vps_list_servers handler exists & returns array', async () => {
    const res = await server.managers.vps.listServers?.('test-user');
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
  });

  test('n8n_list_instances handler returns array', async () => {
    const res = await server.managers.n8n.listInstances?.('test-user');
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
  });

  test('wordpress list sites returns array', async () => {
    const res = await server.managers.wordpress.listSites?.('test-user');
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
  });

  test('social list accounts returns array', async () => {
    const res = await server.managers.postiz.listAccounts?.('test-user');
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
  });

  test('affiliate list networks returns array', async () => {
    const res = await server.managers.affiliate.listNetworks?.('test-user');
    expect(res).toBeDefined();
    expect(Array.isArray(res)).toBe(true);
  });
});
