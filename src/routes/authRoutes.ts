import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { logActivity, ActionType } from '../services/loggerService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'PLEASE_CHANGE_ME_SECRET';

router.post('/register', async (req, res) => {
  const { name, email, password, role, branch } = req.body;
  const trimmedEmail = email?.trim();
  const trimmedName = name?.trim();

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE TRIM(LOWER(email)) = TRIM(LOWER(?))').get(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, name, email, password, role, branch) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, trimmedName, trimmedEmail, hashedPassword, role, branch);

    const token = jwt.sign({ id, role, branch }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, name, email, role, branch } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = email?.trim();

  try {
    const user: any = db.prepare('SELECT * FROM users WHERE TRIM(LOWER(email)) = TRIM(LOWER(?))').get(trimmedEmail);
    if (!user) {
      console.log(`Login failed: User not found for email ${trimmedEmail}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for user ${trimmedEmail}`);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, branch: user.branch }, JWT_SECRET, { expiresIn: '7d' });
    
    // Log Activity
    logActivity(user.id, ActionType.LOGIN, { email: user.email });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, branch: user.branch } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

import { authenticate, AuthRequest } from '../middleware/authMiddleware.js';

// Verify Invitation Token
router.get('/verify-invite', (req, res) => {
  const { token } = req.query;
  
  try {
    const invitation: any = db.prepare(`
      SELECT i.*, u.name, u.email, u.role, u.branch 
      FROM invitations i
      JOIN users u ON i.user_id = u.id
      WHERE i.token = ? AND i.used = 0 AND i.expires_at > CURRENT_TIMESTAMP
    `).get(token);

    if (!invitation) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    res.json({ 
      user: {
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        branch: invitation.branch
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete Invitation (Set Password)
router.post('/complete-invite', async (req, res) => {
  const { token, password } = req.body;

  try {
    const invitation: any = db.prepare('SELECT * FROM invitations WHERE token = ? AND used = 0').get(token);
    
    if (!invitation || new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Update user password and mark invitation as used in a transaction
    const updateTransaction = db.transaction(() => {
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, invitation.user_id);
      db.prepare('UPDATE invitations SET used = 1 WHERE token = ?').run(token);
    });

    updateTransaction();

    res.json({ message: 'Account activated successfully' });
  } catch (error) {
    console.error('Complete invite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', authenticate, (req: AuthRequest, res) => {
  if (req.user) {
    logActivity(req.user.id, ActionType.LOGOUT);
  }
  res.json({ message: 'Logged out successfully' });
});

export default router;
