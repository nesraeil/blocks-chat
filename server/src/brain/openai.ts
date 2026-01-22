import OpenAI from 'openai';
import { config } from '../config.js';
import { getToolDefinitions, getTool, ToolContext } from '../tools/index.js';

const openai = new OpenAI({
    apiKey: config.openaiApiKey
});

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
            name: string;
            arguments: string;
        };
    }>;
}

export interface StreamEvent {
    type: 'content_delta' | 'tool_call_started' | 'tool_call_result' | 'message_complete' | 'error';
    content?: string;
    tool?: string;
    input?: object;
    result?: object;
    messageId?: string;
    message?: string;
}

export async function* streamChat(
    messages: Message[],
    context: ToolContext
): AsyncGenerator<StreamEvent> {
    const systemPrompt = `You are a helpful AI assistant for Blocks, an AI-native application builder. 
You help users build applications and analyze data through conversation.

You have access to powerful tools:
1. create_page - Generate complete, styled web pages (forms, dashboards, landing pages, calculators, lists)
2. analyze_data - Analyze data and generate insights with beautiful HTML reports

DATA ANALYSIS GUIDELINES - CRITICAL:
- ALWAYS use the analyze_data tool when users mention data, numbers, or ask for analysis
- YOU are responsible for converting ANY user input into proper CSV format - NEVER ask users to reformat
- THIS IS FORBIDDEN: "Could you provide the data in CSV format..." or "Please format your data as..."
- Extract numbers and labels from natural language and format as CSV yourself

EXAMPLES OF CORRECT BEHAVIOR:
- User: "My expenses: rent $2400, food $850, transport $320" → Call analyze_data with data: "Category,Amount\nRent,2400\nFood,850\nTransport,320"
- User: "Traffic was 1200 on Monday, 1800 Tuesday, 2100 Wednesday" → Call analyze_data with data: "Day,Traffic\nMonday,1200\nTuesday,1800\nWednesday,2100"
- User: "Sales: Jan 50k, Feb 62k, Mar 71k" → Call analyze_data with data: "Month,Sales\nJan,50000\nFeb,62000\nMar,71000"
- Always infer reasonable column headers (Day, Category, Month, Item, etc.) based on context

IMPORTANT GUIDELINES:
- When using tools, DO NOT output the generated code or HTML in your response
- Keep responses SHORT - just 1-2 sentences confirming what you did
- Let the preview speak for itself - users can see the dashboard/page directly
- Ask follow-up questions like "Would you like me to modify anything?" or "Want me to add more features?"

Example GOOD responses:
- "Here's your page! 🎉 Want me to change anything?"
- "Done! Would you like any adjustments?"
- "Your analysis is ready! 📊 Let me know if you want me to tweak anything."

Example BAD response (too long):
"I've analyzed your data and found several interesting insights. The average is 54.7 and the median is 56..." (Don't explain - they can see it in the dashboard!)`;


    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => {
            if (m.role === 'tool') {
                return {
                    role: 'tool' as const,
                    content: m.content,
                    tool_call_id: m.tool_call_id!
                };
            }
            if (m.tool_calls) {
                return {
                    role: 'assistant' as const,
                    content: m.content || null,
                    tool_calls: m.tool_calls
                };
            }
            return {
                role: m.role as 'user' | 'assistant',
                content: m.content
            };
        })
    ];

    const toolDefinitions = getToolDefinitions();

    try {
        const stream = await openai.chat.completions.create({
            model: 'gpt-4.1',
            messages: openaiMessages,
            tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
            stream: true
        });

        let currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();
        let fullContent = '';

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            // Handle content streaming
            if (delta?.content) {
                fullContent += delta.content;
                yield { type: 'content_delta', content: delta.content };
            }

            // Handle tool calls
            if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                    const index = toolCall.index;

                    if (!currentToolCalls.has(index)) {
                        currentToolCalls.set(index, {
                            id: toolCall.id || '',
                            name: toolCall.function?.name || '',
                            arguments: ''
                        });
                    }

                    const current = currentToolCalls.get(index)!;

                    if (toolCall.id) {
                        current.id = toolCall.id;
                    }
                    if (toolCall.function?.name) {
                        current.name = toolCall.function.name;
                    }
                    if (toolCall.function?.arguments) {
                        current.arguments += toolCall.function.arguments;
                    }
                }
            }

            // Check if we've finished streaming and have tool calls to execute
            if (chunk.choices[0]?.finish_reason === 'tool_calls') {
                // Execute each tool call
                for (const [, toolCall] of currentToolCalls) {
                    const tool = getTool(toolCall.name);
                    if (!tool) {
                        yield {
                            type: 'error',
                            message: `Unknown tool: ${toolCall.name}`
                        };
                        continue;
                    }

                    let input: object;
                    try {
                        input = JSON.parse(toolCall.arguments);
                    } catch {
                        yield {
                            type: 'error',
                            message: `Invalid tool arguments for ${toolCall.name}`
                        };
                        continue;
                    }

                    // Emit tool_call_started
                    yield {
                        type: 'tool_call_started',
                        tool: toolCall.name,
                        input
                    };

                    // Execute the tool
                    const result = await tool.$run(input, context);

                    // Emit tool_call_result
                    yield {
                        type: 'tool_call_result',
                        tool: toolCall.name,
                        result
                    };

                    // Continue the conversation with tool results
                    const toolMessages: Message[] = [
                        ...messages,
                        {
                            role: 'assistant',
                            content: fullContent,
                            tool_calls: Array.from(currentToolCalls.values()).map(tc => ({
                                id: tc.id,
                                type: 'function' as const,
                                function: {
                                    name: tc.name,
                                    arguments: tc.arguments
                                }
                            }))
                        },
                        {
                            role: 'tool',
                            content: JSON.stringify(result),
                            tool_call_id: toolCall.id
                        }
                    ];

                    // Recursively stream the continuation
                    for await (const event of streamChat(toolMessages, context)) {
                        yield event;
                    }
                    return;
                }
            }
        }

        yield { type: 'message_complete', messageId: crypto.randomUUID() };
    } catch (error) {
        yield {
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
