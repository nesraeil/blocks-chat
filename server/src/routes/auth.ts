import { Router, Request, Response } from 'express';
import { dbRun, dbGet } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';

export const authRouter = Router();

// Login or Register with email (simple auth)
authRouter.post('/login', (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    let user = dbGet<{ id: string; email: string }>(
        'SELECT * FROM users WHERE email = ?',
        [normalizedEmail]
    );

    // If not, create user
    if (!user) {
        const userId = uuidv4();
        dbRun('INSERT INTO users (id, email) VALUES (?, ?)', [userId, normalizedEmail]);
        user = { id: userId, email: normalizedEmail };
    }

    // Create session
    const token = uuidv4();
    dbRun('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, user.id]);

    res.json({
        token,
        user: {
            id: user.id,
            email: user.email
        }
    });
});

// Get current user
authRouter.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.user });
});

// Logout
authRouter.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.slice(7);
        dbRun('DELETE FROM sessions WHERE token = ?', [token]);
    }
    res.json({ success: true });
});
