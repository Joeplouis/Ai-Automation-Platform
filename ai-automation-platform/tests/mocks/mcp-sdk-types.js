export const CallToolRequestSchema = { name: 'CallToolRequestSchema' };
export const ListToolsRequestSchema = { name: 'ListToolsRequestSchema' };
export const ErrorCode = { MethodNotFound: 'MethodNotFound', InvalidRequest: 'InvalidRequest' };
export class McpError extends Error { constructor(code,msg){ super(msg); this.code = code; } }
