import express from 'express';
import db from '../lib/db.js';
import { authenticate, authorize, Role } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get Activity Logs (Admin only)
// Accessible by Admin, Super Admin, Principal, Vice Principal
router.get('/', authenticate, authorize(Role.VICE_PRINCIPAL), (req, res) => {
  const { userId, actionType, startDate, endDate } = req.query;
  
  let query = `
    SELECT al.*, u.name as user_name, u.role as user_role 
    FROM activity_logs al
    JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (userId) {
    query += ' AND al.user_id = ?';
    params.push(userId);
  }

  if (actionType) {
    query += ' AND al.action_type = ?';
    params.push(actionType);
  }

  if (startDate) {
    query += ' AND al.timestamp >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND al.timestamp <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY al.timestamp DESC LIMIT 1000';

  try {
    const logs = db.prepare(query).all(...params);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch activity logs: ' + error.message });
  }
});

export default router;
