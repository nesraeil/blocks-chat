import { Request, Response, NextFunction } from 'express';
import { dbGet } from '../db/index.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
    };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const token = authHeader.slice(7);

    const session = dbGet<{ user_id: string; email: string }>(
        `SELECT s.user_id, u.email 
         FROM sessions s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.token = ?`,
        [token]
    );

    if (!session) {
        res.status(401).json({ error: 'Invalid session' });
        return;
    }

    req.user = {
        id: session.user_id,
        email: session.email
    };

    next();
}
