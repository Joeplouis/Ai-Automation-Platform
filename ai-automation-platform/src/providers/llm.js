// Minimal test stub for LLM provider to satisfy imports in MCP server tests.
export function createLLMProvider(name = 'stub') {
  return {
    name,
    async generate(prompt) {
      return { text: `stub-response:${prompt.slice(0,20)}` };
    }
  };
}
