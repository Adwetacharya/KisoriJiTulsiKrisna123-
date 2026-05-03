import express from 'express';
import db from '../lib/db.js';
import { authenticate, authorize, Role, AuthRequest } from '../middleware/authMiddleware.js';
import { logActivity, ActionType } from '../services/loggerService.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sendInviteEmail } from '../services/emailService.js';
import crypto from 'crypto';

const router = express.Router();

// Directory search
router.get('/', authenticate, (req, res) => {
  const { role, branch, search } = req.query;
  let query = 'SELECT id, name, email, role, branch, avatar FROM users WHERE 1=1';
  const params: any[] = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  if (branch) {
    query += ' AND branch = ?';
    params.push(branch);
  }
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const users = db.prepare(query).all(...params);
  res.json(users);
});

// List Users (Admin only)
router.get('/admin-list', authenticate, authorize(Role.SUB_ADMIN), (req: AuthRequest, res) => {
  const { search, role, branch, page = '1', limit = '10' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  let query = 'SELECT id, name, email, role, branch, phone, year, bio, avatar, created_at FROM users WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
  const params: any[] = [];

  if (search) {
    const searchPattern = `%${search}%`;
    query += ' AND (name LIKE ? OR email LIKE ?)';
    countQuery += ' AND (name LIKE ? OR email LIKE ?)';
    params.push(searchPattern, searchPattern);
  }

  if (role) {
    query += ' AND role = ?';
    countQuery += ' AND role = ?';
    params.push(role);
  }

  if (branch) {
    query += ' AND branch = ?';
    countQuery += ' AND branch = ?';
    params.push(branch);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const queryParams = [...params, limitNum, offset];

  try {
    const users = db.prepare(query).all(...queryParams);
    const totalResult = db.prepare(countQuery).get(...params) as { total: number };
    
    logActivity(req.user!.id, 'VIEW_USERS', { filters: { search, role, branch } });

    res.json({
      users,
      total: totalResult.total,
      page: pageNum,
      pages: Math.ceil(totalResult.total / limitNum)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
});

// Admin: Create User
router.post('/', authenticate, authorize(Role.SUB_ADMIN), async (req: AuthRequest, res) => {
  const { name, email, password, role, branch, phone, year } = req.body;
  const trimmedEmail = email?.trim();
  const trimmedName = name?.trim();

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE TRIM(LOWER(email)) = TRIM(LOWER(?))').get(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Default password for invited users (they will change it via token)
    const initialPassword = password || crypto.randomBytes(16).toString('hex');
    const hashedPassword = bcrypt.hashSync(initialPassword, 10);
    const id = uuidv4();

    db.prepare('INSERT INTO users (id, name, email, password, role, branch, phone, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, trimmedName, trimmedEmail, hashedPassword, role, branch || null, phone || null, year || null);

    // Generate Invitation Token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    db.prepare('INSERT INTO invitations (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(inviteToken, id, expiresAt);

    // Send Invite Email
    try {
      await sendInviteEmail(email, name, role, inviteToken);
      logActivity(req.user!.id, ActionType.SEND_INVITE_EMAIL, { target_user_id: id, email });
    } catch (emailError) {
      console.error('Email delivery failed but user was created:', emailError);
    }

    // Log User Creation
    logActivity(req.user!.id, ActionType.CREATE_USER, { 
      target_user_id: id, 
      target_user_email: email,
      role_assigned: role 
    });

    res.json({ message: 'User created and invitation email sent', id });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
});

// Admin: Delete User
router.delete('/:id', authenticate, authorize(Role.SUB_ADMIN), (req: AuthRequest, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logActivity(req.user!.id, 'DELETE_USER', { target_user_id: id });
    res.json({ message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete: ' + error.message });
  }
});

// Update Profile
router.patch('/:id', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, avatar, bio, branch, phone, year } = req.body;

  // Users can only update their own profile unless they are admins (Sub Admin or above)
  if (req.user?.id !== id && req.user?.role !== Role.SUB_ADMIN && req.user?.role !== Role.SUPER_ADMIN) {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }

  try {
    const fields = [];
    const params = [];

    if (name) { fields.push('name = ?'); params.push(name); }
    if (avatar !== undefined) { fields.push('avatar = ?'); params.push(avatar); }
    if (bio !== undefined) { fields.push('bio = ?'); params.push(bio); }
    if (branch) { fields.push('branch = ?'); params.push(branch); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (year !== undefined) { fields.push('year = ?'); params.push(year); }
    
    // Only admins can update roles
    const isAdmin = req.user?.role === Role.SUB_ADMIN || req.user?.role === Role.SUPER_ADMIN;
    if (req.body.role && isAdmin) {
      fields.push('role = ?');
      params.push(req.body.role);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    
    // Log Activity
    logActivity(req.user!.id, ActionType.UPDATE_PROFILE, { 
      target_user_id: id,
      updated_fields: Object.keys(req.body).filter(k => req.body[k] !== undefined)
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile: ' + error.message });
  }
});

export default router;
