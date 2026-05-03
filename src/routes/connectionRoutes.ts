import express from 'express';
import db from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/authMiddleware.js';
import { logActivity, ActionType } from '../services/loggerService.js';
import { createNotification } from './notificationRoutes.js';

const router = express.Router();

// Get connection status with another user
router.get('/status/:userId', authenticate, (req: AuthRequest, res) => {
  const connection: any = db.prepare(`
    SELECT * FROM connections
    WHERE (requester_id = ? AND receiver_id = ?)
    OR (requester_id = ? AND receiver_id = ?)
  `).get(req.user?.id, req.params.userId, req.params.userId, req.user?.id);

  res.json(connection || { status: 'none' });
});

// Send connection request
router.post('/request/:userId', authenticate, (req: AuthRequest, res) => {
  try {
    db.prepare('INSERT INTO connections (requester_id, receiver_id, status) VALUES (?, ?, ?)')
      .run(req.user?.id, req.params.userId, 'pending');
    
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user?.id) as any;
    createNotification(req, req.params.userId, 'connection_request', 'Connection Request', `${user.name} wants to connect with you.`, { requester_id: req.user?.id });

    // Log Activity
    logActivity(req.user!.id, ActionType.FOLLOW_REQUEST_SEND, { receiver_id: req.params.userId });

    res.json({ message: 'Request sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Accept request
router.post('/accept/:userId', authenticate, (req: AuthRequest, res) => {
  try {
    db.prepare('UPDATE connections SET status = ? WHERE requester_id = ? AND receiver_id = ?')
      .run('accepted', req.params.userId, req.user?.id);
    
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user?.id) as any;
    createNotification(req, req.params.userId, 'connection_accept', 'Request Accepted', `${user.name} accepted your connection request.`, { receiver_id: req.user?.id });

    // Log Activity
    logActivity(req.user!.id, ActionType.FOLLOW_REQUEST_ACCEPT, { requester_id: req.params.userId });

    res.json({ message: 'Request accepted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept' });
  }
});

// Remove connection/request
router.delete('/:userId', authenticate, (req: AuthRequest, res) => {
  try {
    db.prepare(`
      DELETE FROM connections
      WHERE (requester_id = ? AND receiver_id = ?)
      OR (requester_id = ? AND receiver_id = ?)
    `).run(req.user?.id, req.params.userId, req.params.userId, req.user?.id);
    
    // Log Activity
    logActivity(req.user!.id, ActionType.FOLLOW_REQUEST_REVOKE, { target_user_id: req.params.userId });

    res.json({ message: 'Connection removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove' });
  }
});

// Get user connections
router.get('/', authenticate, (req: AuthRequest, res) => {
  const connections = db.prepare(`
    SELECT u.id, u.name, u.role, u.branch, u.avatar
    FROM users u
    JOIN connections c ON (c.requester_id = u.id OR c.receiver_id = u.id)
    WHERE (c.requester_id = ? OR c.receiver_id = ?)
    AND c.status = 'accepted'
    AND u.id != ?
  `).all(req.user?.id, req.user?.id, req.user?.id);
  res.json(connections);
});

export default router;
