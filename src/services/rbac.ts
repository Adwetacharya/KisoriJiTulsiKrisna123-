import { Role, GroupType, User, Group } from '../types.js';

export interface RBACPermissions {
  canView: boolean;
  canPost: boolean;
}

export function getGroupPermissions(user: User, group: Group): RBACPermissions {
  const { role, branch: userBranch } = user;
  const { type: groupType, branch: groupBranch } = group;

  let canView = false;
  let canPost = false;

  const isOwnBranch = groupBranch === userBranch;

  // 1. Super Admin & Admin
  if (role === Role.SUPER_ADMIN || role === Role.SUB_ADMIN) {
    const vAndP = [
      GroupType.PRINCIPAL,
      GroupType.VICE_PRINCIPAL,
      GroupType.HOD,
      GroupType.FACULTY,
      GroupType.OFFICIAL
    ];
    if (vAndP.includes(groupType)) {
      canView = true;
      canPost = true;
    }
    if (groupType === GroupType.BRANCH && isOwnBranch) {
      canView = true;
      canPost = true;
    }
  }

  // 2. Faculty (including Sub Faculty)
  else if (role === Role.FACULTY || role === Role.SUB_FACULTY) {
    if (groupType === GroupType.FACULTY || groupType === GroupType.HOD) {
      canView = true;
      canPost = true;
    }
    if (groupType === GroupType.BRANCH && isOwnBranch) {
      canView = true;
      canPost = true;
    }
    if (groupType === GroupType.OFFICIAL) {
      canView = true;
      canPost = false;
    }
  }

  // 3. HOD
  else if (role === Role.HOD) {
    const vAndP = [GroupType.HOD, GroupType.FACULTY, GroupType.OFFICIAL];
    if (vAndP.includes(groupType)) {
      canView = true;
      canPost = true;
    }
    if (groupType === GroupType.BRANCH && isOwnBranch) {
      canView = true;
      canPost = true;
    }
  }

  // 4. Principal
  else if (role === Role.PRINCIPAL) {
    const vAndP = [
      GroupType.VICE_PRINCIPAL,
      GroupType.HOD,
      GroupType.FACULTY,
      GroupType.OFFICIAL
    ];
    if (vAndP.includes(groupType)) {
      canView = true;
      canPost = true;
    }
    if (groupType === GroupType.BRANCH && isOwnBranch) {
      canView = true;
      canPost = true;
    }
  }

  // 5. Vice Principal
  else if (role === Role.VICE_PRINCIPAL) {
    const vAndP = [
      GroupType.PRINCIPAL,
      GroupType.HOD,
      GroupType.FACULTY,
      GroupType.OFFICIAL
    ];
    if (vAndP.includes(groupType)) {
      canView = true;
      canPost = true;
    }
    if (groupType === GroupType.BRANCH && isOwnBranch) {
      canView = true;
      canPost = true;
    }
  }

  // 6. Student
  else if (role === Role.STUDENT) {
    if (groupType === GroupType.OFFICIAL || groupType === GroupType.BRANCH) {
      canView = true;
      canPost = false;
    }
    if (groupType === GroupType.STUDENT) {
      canView = true;
      canPost = true;
    }
  }

  // 7. Student + Class Representative
  else if (role === Role.CLASS_REP) {
    if (groupType === GroupType.OFFICIAL) {
      canView = true;
      canPost = false;
    }
    if (groupType === GroupType.STUDENT || groupType === GroupType.BRANCH) {
      canView = true;
      canPost = true;
    }
  }

  return { canView, canPost };
}
