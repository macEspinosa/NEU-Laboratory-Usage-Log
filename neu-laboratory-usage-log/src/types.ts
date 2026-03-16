export type UserRole = 'admin' | 'professor';
export type EntryMethod = 'qr' | 'email';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isBlocked: boolean;
  universityId: string;
}

export interface UsageLog {
  id?: string;
  userId: string;
  userName: string;
  roomNumber: string;
  timestamp: string;
  entryMethod: EntryMethod;
}

export interface Room {
  id?: string;
  roomNumber: string;
  buildingName: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName?: string | null;
      email?: string | null;
      photoUrl?: string | null;
    }[];
  }
}
