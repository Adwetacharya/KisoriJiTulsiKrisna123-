import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all notifications for the current user
router.get('/', authenticate, (req: AuthRequest, res) => {
  const userId = req.user?.id;
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `).all(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark a notification as read
router.patch('/:id/read', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all as read
router.post('/read-all', authenticate, (req: AuthRequest, res) => {
  const userId = req.user?.id;
  try {
    db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Helper function to create a notification (to be used in other routes)
export const createNotification = (req: any, userId: string, type: string, title: string, content: string, data?: any) => {
  const id = uuidv4();
  const dataJson = data ? JSON.stringify(data) : null;
  
  try {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, data_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, title, content, dataJson);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    
    // Trigger real-time notification if possible
    if (req.app && typeof req.app.sendNotification === 'function') {
      req.app.sendNotification(userId, notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

export default router;
