import { Router, Response } from 'express';
import { dbRun, dbGet, dbAll } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const conversationsRouter = Router();

// All routes require authentication
conversationsRouter.use(authMiddleware);

// List user's conversations
conversationsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
    const conversations = dbAll<any>(
        `SELECT id, title, created_at, updated_at 
         FROM conversations 
         WHERE user_id = ? 
         ORDER BY updated_at DESC`,
        [req.user!.id]
    );

    res.json({ conversations });
});

// Create new conversation
conversationsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
    const { title } = req.body;
    const id = uuidv4();

    dbRun(
        'INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)',
        [id, req.user!.id, title || 'New Chat']
    );

    const conversation = dbGet<any>('SELECT * FROM conversations WHERE id = ?', [id]);
    res.status(201).json({ conversation });
});

// Get conversation with messages
conversationsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const conversation = dbGet<any>(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [id, req.user!.id]
    );

    if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    const messages = dbAll<any>(
        `SELECT id, role, content, tool_name, tool_input, tool_result, created_at 
         FROM messages 
         WHERE conversation_id = ? 
         ORDER BY created_at ASC`,
        [id]
    );

    res.json({ conversation, messages });
});

// Update conversation title
conversationsRouter.patch('/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { title } = req.body;

    const existing = dbGet<any>(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [id, req.user!.id]
    );

    if (!existing) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    dbRun(
        'UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, id]
    );

    const conversation = dbGet<any>('SELECT * FROM conversations WHERE id = ?', [id]);
    res.json({ conversation });
});

// Delete conversation
conversationsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const existing = dbGet<any>(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [id, req.user!.id]
    );

    if (!existing) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
    }

    // Delete messages first
    dbRun('DELETE FROM messages WHERE conversation_id = ?', [id]);
    dbRun('DELETE FROM conversations WHERE id = ?', [id]);

    res.json({ success: true });
});
