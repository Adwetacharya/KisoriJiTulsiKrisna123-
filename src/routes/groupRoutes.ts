import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/authMiddleware.js';
import { getGroupPermissions } from '../services/rbac.js';
import { Group, GroupType } from '../types.js';

const router = express.Router();

// Get all groups with permissions
router.get('/', authenticate, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  const groups = db.prepare('SELECT * FROM groups').all() as Group[];
  
  const filteredGroups = groups.map(group => {
    const permissions = getGroupPermissions(user, group);
    return { ...group, ...permissions };
  }).filter(g => g.canView);

  res.json(filteredGroups);
});

// Create basic groups if they don't exist (Seed)
router.post('/seed', authenticate, (req: AuthRequest, res) => {
  const groupTypes = [
    { name: 'Principal Portal', type: GroupType.PRINCIPAL },
    { name: 'Vice Principal Portal', type: GroupType.VICE_PRINCIPAL },
    { name: 'HOD Lounge', type: GroupType.HOD },
    { name: 'Faculty Forum', type: GroupType.FACULTY },
    { name: 'Official Channel', type: GroupType.OFFICIAL },
    { name: 'Student Square', type: GroupType.STUDENT }
  ];

  groupTypes.forEach(g => {
    const existing = db.prepare('SELECT * FROM groups WHERE type = ?').get(g.type);
    if (!existing) {
      db.prepare('INSERT INTO groups (id, name, type, created_by) VALUES (?, ?, ?, ?)')
        .run(uuidv4(), g.name, g.type, req.user?.id);
    }
  });

  // Also seed branch groups
  const branches = ['Computer Science', 'Electronics', 'Mechanical', 'Electrical', 'Civil'];
  branches.forEach(branch => {
    const existing = db.prepare('SELECT * FROM groups WHERE type = ? AND branch = ?').get(GroupType.BRANCH, branch);
    if (!existing) {
      db.prepare('INSERT INTO groups (id, name, type, branch, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), `${branch} Hub`, GroupType.BRANCH, branch, req.user?.id);
    }
  });

  res.json({ message: 'Groups seeded' });
});

// Get posts for a specific group
router.get('/:id/posts', authenticate, (req: AuthRequest, res) => {
  const groupId = req.params.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.id) as any;
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId) as Group;

  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { canView } = getGroupPermissions(user, group);
  if (!canView) return res.status(403).json({ error: 'Access denied to this group' });

  const posts = db.prepare(`
    SELECT p.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.group_id = ?
    ORDER BY p.created_at DESC
  `).all(user.id, groupId);

  res.json(posts);
});

// Create post in a group
router.post('/:id/posts', authenticate, (req: AuthRequest, res) => {
  const groupId = req.params.id;
  const { content, image, file_url, file_type } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.id) as any;
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId) as Group;

  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { canPost } = getGroupPermissions(user, group);
  if (!canPost) return res.status(403).json({ error: 'You do not have permission to post in this group' });

  const id = uuidv4();
  try {
    db.prepare('INSERT INTO posts (id, user_id, group_id, content, image, file_url, file_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, user.id, groupId, content, image, file_url, file_type);
    
    const post = db.prepare(`
      SELECT p.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar, 0 as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

export default router;
