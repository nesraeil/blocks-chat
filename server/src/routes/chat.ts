import { Router, Response } from 'express';
import { dbRun, dbGet, dbAll } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { streamChat, Message } from '../brain/openai.js';

export const chatRouter = Router();

// All routes require authentication
chatRouter.use(authMiddleware);

// Send message and stream response
chatRouter.post('/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required' });
        return;
    }

    // Verify conversation belongs to user
    const conversation = dbGet<any>(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [conversationId, req.user!.id]
    );

    if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    // Save user message
    const userMessageId = uuidv4();
    dbRun(
        'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
        [userMessageId, conversationId, 'user', message]
    );

    // Get conversation history
    const historyMessages = dbAll<{
        role: string;
        content: string;
        tool_name: string | null;
        tool_input: string | null;
        tool_result: string | null;
    }>(
        `SELECT role, content, tool_name, tool_input, tool_result 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC`,
        [conversationId]
    );

    // Convert to Message format for OpenAI
    const messages: Message[] = historyMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
    }));

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let assistantContent = '';
    const toolEvents: Array<{ name: string; input: object; result: object }> = [];

    try {
        // Stream the response
        for await (const event of streamChat(messages, {
            userId: req.user!.id,
            conversationId
        })) {
            // Send event to client
            res.write(`data: ${JSON.stringify(event)}\n\n`);

            // Collect content for saving
            if (event.type === 'content_delta' && event.content) {
                assistantContent += event.content;
            }

            // Track tool events
            if (event.type === 'tool_call_started') {
                toolEvents.push({
                    name: event.tool!,
                    input: event.input!,
                    result: {}
                });
            }

            if (event.type === 'tool_call_result') {
                const lastTool = toolEvents[toolEvents.length - 1];
                if (lastTool) {
                    lastTool.result = event.result!;
                }
            }
        }

        // Save assistant message
        const assistantMessageId = uuidv4();
        dbRun(
            `INSERT INTO messages (id, conversation_id, role, content, tool_name, tool_input, tool_result) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                assistantMessageId,
                conversationId,
                'assistant',
                assistantContent,
                toolEvents.length > 0 ? toolEvents.map(t => t.name).join(',') : null,
                toolEvents.length > 0 ? JSON.stringify(toolEvents.map(t => t.input)) : null,
                toolEvents.length > 0 ? JSON.stringify(toolEvents.map(t => t.result)) : null
            ]
        );

        // Update conversation timestamp and title if first message
        const messageCount = dbGet<{ count: number }>(
            'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
            [conversationId]
        );

        if (messageCount && messageCount.count <= 2) {
            // Generate title from first user message
            const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
            dbRun(
                'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [title, conversationId]
            );
        } else {
            dbRun(
                'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [conversationId]
            );
        }

        // Send done event
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
    } catch (error) {
        console.error('Chat error:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
        })}\n\n`);
        res.end();
    }
});
