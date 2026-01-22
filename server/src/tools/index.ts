// Tool registration and management

export interface ToolContext {
    userId: string;
    conversationId: string;
}

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

export interface Tool {
    name: string;
    description: string;
    inputSchema: object;
    $run: (input: any, context: ToolContext) => Promise<ToolResult>;
}

// Tool registry
const tools: Map<string, Tool> = new Map();

export function registerTool(tool: Tool): void {
    tools.set(tool.name, tool);
}

export function getTool(name: string): Tool | undefined {
    return tools.get(name);
}

export function getAllTools(): Tool[] {
    return Array.from(tools.values());
}

export function getToolDefinitions(): Array<{
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: object;
    };
}> {
    return getAllTools().map(tool => ({
        type: 'function' as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema
        }
    }));
}

// Register tools
import { createPageTool } from './create-page.js';
import { analyzeDataTool } from './analyze-data.js';

registerTool(createPageTool);
registerTool(analyzeDataTool);

console.log(`✅ Registered ${tools.size} tools: ${Array.from(tools.keys()).join(', ')}`);
