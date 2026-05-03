export enum Role {
  STUDENT = 'Student',
  CLASS_REP = 'Class Representative',
  FACULTY = 'Faculty',
  SUB_FACULTY = 'Sub Faculty',
  HOD = 'HOD',
  PRINCIPAL = 'Principal',
  VICE_PRINCIPAL = 'Vice Principal',
  SUB_ADMIN = 'Sub Admin',
  SUPER_ADMIN = 'Super Admin'
}

export enum GroupType {
  PRINCIPAL = 'Principal Group',
  VICE_PRINCIPAL = 'Vice Principal Group',
  HOD = 'HOD Group',
  FACULTY = 'Faculty Group',
  OFFICIAL = 'Official Group',
  BRANCH = 'Branch Group',
  STUDENT = 'Student Group'
}

export const BRANCHES = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Electrical',
  'Civil',
  'Business Administration',
  'Arts & Humanities'
];

export const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  branch?: string;
  phone?: string;
  year?: string;
  avatar?: string;
  created_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image?: string;
  file_url?: string;
  file_type?: string;
  created_at: string;
  updated_at?: string;
  user_name: string;
  user_role: string;
  user_avatar?: string;
  likes_count: number;
  is_liked: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  branch?: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'member' | 'admin';
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}
