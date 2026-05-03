import db from '../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

export enum ActionType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_USER = 'CREATE_USER',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  FOLLOW_REQUEST_SEND = 'FOLLOW_REQUEST_SEND',
  FOLLOW_REQUEST_ACCEPT = 'FOLLOW_REQUEST_ACCEPT',
  FOLLOW_REQUEST_REVOKE = 'FOLLOW_REQUEST_REVOKE',
  ROLE_UPDATE = 'ROLE_UPDATE',
  CAMPUS_LOG = 'CAMPUS_LOG',
  SEND_INVITE_EMAIL = 'SEND_INVITE_EMAIL'
}

export function logActivity(userId: string, actionType: string, details?: any) {
  try {
    const id = uuidv4();
    const detailsStr = details ? JSON.stringify(details) : null;
    db.prepare('INSERT INTO activity_logs (id, user_id, action_type, details) VALUES (?, ?, ?, ?)')
      .run(id, userId, actionType, detailsStr);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
