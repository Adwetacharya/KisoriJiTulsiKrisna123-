import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/authMiddleware.js';
import { logActivity, ActionType } from '../services/loggerService.js';
import { createNotification } from './notificationRoutes.js';

const router = express.Router();

router.get('/:targetId', authenticate, (req: AuthRequest, res) => {
  const targetId = req.params.targetId;
  const userId = req.user?.id;

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?)
    OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `).all(userId, targetId, targetId, userId);

  res.json(messages);
});

router.post('/:targetId', authenticate, (req: AuthRequest, res) => {
  const { content } = req.body;
  const targetId = req.params.targetId;
  const userId = req.user?.id;
  const id = uuidv4();

  try {
    // Check if connected
    const connected = db.prepare(`
      SELECT * FROM connections
      WHERE ((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))
      AND status = 'accepted'
    `).get(userId, targetId, targetId, userId);

    if (!connected) {
      // return res.status(403).json({ error: 'You can only chat with connections' });
    }

    db.prepare('INSERT INTO messages (id, sender_id, receiver_id, content) VALUES (?, ?, ?, ?)')
      .run(id, userId, targetId, content);

    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
    createNotification(req, targetId, 'message', 'New Message', `${user.name} sent you a message: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`, { sender_id: userId, message_id: id });

    logActivity(userId!, 'CHAT_MESSAGE_SEND', { receiver_id: targetId });

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
