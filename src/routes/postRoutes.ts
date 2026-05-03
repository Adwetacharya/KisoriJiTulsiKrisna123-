import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { authenticate, AuthRequest } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all posts (campus feed)
router.get('/', authenticate, (req: AuthRequest, res) => {
  const posts = db.prepare(`
    SELECT p.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.group_id IS NULL
    ORDER BY p.created_at DESC
  `).all(req.user?.id);

  res.json(posts);
});

// Create post
router.post('/', authenticate, (req: AuthRequest, res) => {
  const { content, image, file_url, file_type } = req.body;
  const id = uuidv4();

  try {
    db.prepare('INSERT INTO posts (id, user_id, content, image, file_url, file_type) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, req.user?.id, content, image, file_url, file_type);
    
    const post = db.prepare(`
      SELECT p.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar, 0 as likes_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(id);

    res.json(post);
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update post
router.patch('/:id', authenticate, (req: AuthRequest, res) => {
  const { content, image, file_url, file_type } = req.body;
  const postId = req.params.id;
  const userId = req.user?.id;

  try {
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) as any;
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== userId) return res.status(403).json({ error: 'Unauthorized to edit this post' });

    db.prepare(`
      UPDATE posts 
      SET content = ?, image = ?, file_url = ?, file_type = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(content, image, file_url, file_type, postId);

    const updatedPost = db.prepare(`
      SELECT p.*, u.name as user_name, u.role as user_role, u.avatar as user_avatar,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `).get(userId, postId);

    res.json(updatedPost);
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Like/Unlike post
router.post('/:id/like', authenticate, (req: AuthRequest, res) => {
  const postId = req.params.id;
  const userId = req.user?.id;

  try {
    const existing = db.prepare('SELECT * FROM likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
    if (existing) {
      db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
      res.json({ liked: false });
    } else {
      db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, userId);
      res.json({ liked: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Comments
router.get('/:id/comments', authenticate, (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

router.post('/:id/comments', authenticate, (req: AuthRequest, res) => {
  const { content } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)')
      .run(id, req.params.id, req.user?.id, content);
    
    const comment = db.prepare(`
      SELECT c.*, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(id);
    res.json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
