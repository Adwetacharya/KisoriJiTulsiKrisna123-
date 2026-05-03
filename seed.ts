import db from './src/lib/db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  const password = bcrypt.hashSync('password123', 10);
  
  const users = [
    { name: 'Alice Student', email: 'student@campus.com', role: 'Student', branch: 'Computer Science' },
    { name: 'Bob Rep', email: 'rep@campus.com', role: 'Class Representative', branch: 'Computer Science' },
    { name: 'Charlie Faculty', email: 'faculty@campus.com', role: 'Faculty', branch: 'Electronics' },
    { name: 'David HOD', email: 'hod@campus.com', role: 'HOD', branch: 'Computer Science' },
    { name: 'Eve Principal', email: 'principal@campus.com', role: 'Principal', branch: 'Administration' },
    { name: 'Frank Admin', email: 'admin@campus.com', role: 'Super Admin', branch: 'IT' },
  ];

  for (const user of users) {
    const id = uuidv4();
    try {
      db.prepare('INSERT INTO users (id, name, email, password, role, branch) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, user.name, user.email, password, user.role, user.branch);
      console.log(`Seeded user: ${user.name}`);
    } catch (e) {
      console.log(`User ${user.name} already exists`);
    }
  }

  // Seed a sample timetable
  const ttId = uuidv4();
  const schedule = [
    { time: '09:00 AM', subject: 'Advanced Algorithms', faculty_name: 'Dr. Sarah Wilson' },
    { time: '11:15 AM', subject: 'Machine Learning', faculty_name: 'Prof. David Chen' },
    { time: '02:00 PM', subject: 'Systems Design', faculty_name: 'Dr. Alex Reed' },
  ];
  try {
    db.prepare('INSERT INTO timetables (id, branch, year, section, day, schedule_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ttId, 'Computer Science', '3', 'A', 'Monday', JSON.stringify(schedule));
  } catch (e) {}

  console.log('Seeding complete!');
}

seed();
