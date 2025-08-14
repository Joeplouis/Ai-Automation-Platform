export class Server {
  constructor(meta, caps){
    this.meta = meta; 
    this.caps = caps; 
    this.handlers = {}; 
  }
  setRequestHandler(schema, fn){
    const key = schema?.name || Math.random().toString();
    this.handlers[key] = fn;
  }
  async connect(){ /* no-op for tests */ }
  // Simulate server.listTools by invoking the registered ListTools handler if present
  async listTools(){
    // Find any handler whose key includes 'ListTools' (our schema name in mock types)
    const listKey = Object.keys(this.handlers).find(k => k.includes('ListTools'));
    if (listKey) {
      try {
        const result = await this.handlers[listKey]();
        if (result && Array.isArray(result.tools)) return result;
      } catch (e) {
        return { tools: [], error: e.message };
      }
    }
    return { tools: [] };
  }
  // Provide minimal callTool emulation used by tests (if needed later)
  async callTool(name, args){
    const callKey = Object.keys(this.handlers).find(k => k.includes('CallTool'));
    if (!callKey) throw new Error('CallTool handler not registered in mock');
    return this.handlers[callKey]({ params: { name, arguments: args || {} } });
  }
}
export class StdioServerTransport { async connect(){} }
