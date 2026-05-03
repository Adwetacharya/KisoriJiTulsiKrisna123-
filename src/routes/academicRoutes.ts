import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../lib/db.js';
import { authenticate, authorize, Role, AuthRequest } from '../middleware/authMiddleware.js';
import { logActivity, ActionType } from '../services/loggerService.js';

const router = express.Router();

// Timetable
router.get('/timetable', authenticate, (req: AuthRequest, res) => {
  const { branch, year, section } = req.query;
  const timetable = db.prepare('SELECT * FROM timetables WHERE branch = ? AND year = ? AND section = ?')
    .get(branch, year, section);
  res.json(timetable || null);
});

router.post('/timetable', authenticate, authorize(Role.HOD), (req, res) => {
  const { branch, year, section, day, schedule_json, slots } = req.body;
  const data = schedule_json || slots;
  
  if (!data) {
    return res.status(400).json({ error: 'Schedule data is required' });
  }

  const jsonString = JSON.stringify(data);

  // Check if a timetable for this specific combination already exists
  const existing = db.prepare('SELECT id FROM timetables WHERE branch = ? AND year = ? AND section = ? AND day = ?')
    .get(branch, year, section, day);

  if (existing) {
    db.prepare('UPDATE timetables SET schedule_json = ? WHERE id = ?')
      .run(jsonString, (existing as any).id);
  } else {
    const id = uuidv4();
    db.prepare('INSERT INTO timetables (id, branch, year, section, day, schedule_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, branch, year, section, day, jsonString);
  }
  
  res.json({ message: 'Timetable updated' });
});

// Complaints
router.post('/complaints', authenticate, (req: AuthRequest, res) => {
  const { title, description } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO complaints (id, user_id, title, description) VALUES (?, ?, ?, ?)')
    .run(id, req.user?.id, title, description);
  logActivity(req.user!.id, 'COMPLAINT_SUBMIT', { complaint_id: id, title });
  res.json({ id, message: 'Complaint submitted' });
});

router.patch('/complaints/:id', authenticate, authorize(Role.HOD), (req: AuthRequest, res) => {
  const { status } = req.body;
  try {
    db.prepare('UPDATE complaints SET status = ? WHERE id = ?').run(status, req.params.id);
    
    logActivity(req.user!.id, 'COMPLAINT_STATUS_UPDATE', { 
      complaint_id: req.params.id, 
      status 
    });

    res.json({ message: 'Complaint status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

router.get('/complaints', authenticate, (req: AuthRequest, res) => {
  let query = 'SELECT c.*, u.name as user_name FROM complaints c JOIN users u ON c.user_id = u.id';
  const params = [];
  if (req.user?.role === Role.STUDENT) {
    query += ' WHERE c.user_id = ?';
    params.push(req.user?.id);
  }
  const complaints = db.prepare(query).all(...params);
  res.json(complaints);
});

// Leave Requests
router.post('/leave', authenticate, (req: AuthRequest, res) => {
  const { reason, start_date, end_date } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO leave_requests (id, user_id, reason, start_date, end_date) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.user?.id, reason, start_date, end_date);
  logActivity(req.user!.id, 'LEAVE_REQUEST_SUBMIT', { 
    leave_id: id, 
    start_date, 
    end_date 
  });
  res.json({ id, message: 'Leave request submitted' });
});

router.get('/leave', authenticate, (req: AuthRequest, res) => {
  let query = 'SELECT l.*, u.name as user_name, u.role as user_role FROM leave_requests l JOIN users u ON l.user_id = u.id';
  const params = [];
  if (req.user?.role === Role.STUDENT || req.user?.role === Role.FACULTY) {
    query += ' WHERE l.user_id = ?';
    params.push(req.user?.id);
  }
  const requests = db.prepare(query).all(...params);
  res.json(requests);
});

router.patch('/leave/:id', authenticate, authorize(Role.HOD), (req: AuthRequest, res) => {
  const { status } = req.body;
  try {
    db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?').run(status, req.params.id);
    
    logActivity(req.user!.id, 'LEAVE_STATUS_UPDATE', { 
      leave_id: req.params.id, 
      status 
    });

    res.json({ message: 'Leave request status updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update leave request status' });
  }
});
router.get('/absence', authenticate, authorize(Role.HOD), (req, res) => {
  const absences = db.prepare(`
    SELECT a.*, u.name as faculty_name, u.branch, s.name as substitute_name
    FROM absence_reports a
    JOIN users u ON a.faculty_id = u.id
    LEFT JOIN users s ON a.substitute_id = s.id
    ORDER BY a.date DESC
  `).all();
  res.json(absences);
});

router.patch('/absence/:id', authenticate, authorize(Role.HOD), (req, res) => {
  const { substitute_id } = req.body;
  try {
    const subId = substitute_id === '' ? null : substitute_id;
    db.prepare('UPDATE absence_reports SET substitute_id = ? WHERE id = ?')
      .run(subId, req.params.id);
    res.json({ message: 'Substitute assigned successfully' });
  } catch (error: any) {
    console.error('Error assigning substitute:', error);
    res.status(500).json({ error: 'Failed to assign substitute: ' + error.message });
  }
});

router.post('/absence', authenticate, authorize(Role.FACULTY), (req: AuthRequest, res) => {
  const { date } = req.body;
  const facultyId = req.user?.id;
  const branch = req.user?.branch;
  const id = uuidv4();

  try {
    // Find a substitute faculty from the same branch who is free
    // In a real app, we'd check their timetable. For now, we'll pick any other faculty from the branch.
    const substitute: any = db.prepare(`
      SELECT id FROM users 
      WHERE role = ? AND branch = ? AND id != ? 
      LIMIT 1
    `).get(Role.FACULTY, branch, facultyId);

    db.prepare('INSERT INTO absence_reports (id, faculty_id, date, substitute_id) VALUES (?, ?, ?, ?)')
      .run(id, facultyId, date, substitute?.id || null);

    res.json({ 
      id, 
      message: 'Absence reported', 
      substituteAssigned: substitute ? true : false,
      substituteId: substitute?.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to report absence' });
  }
});

export default router;
