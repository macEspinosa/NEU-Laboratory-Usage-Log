import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, UsageLog, EntryMethod } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHelper';

export interface LogResult {
  success: boolean;
  message: string;
  userName?: string;
}

/**
 * Service to handle laboratory usage logging
 */
export const logService = {
  /**
   * Logs usage by looking up a user by their University ID (from QR)
   */
  async logByUniversityId(universityId: string, roomNumber: string, retryCount = 0): Promise<LogResult> {
    const path = 'users';
    try {
      // 1. Find the user with this universityId
      const usersRef = collection(db, path);
      const q = query(usersRef, where('universityId', '==', universityId), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, message: "Professor ID not found in system." };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      // 2. Check if blocked
      if (userData.isBlocked) {
        return { success: false, message: "Access denied. This account is blocked." };
      }

      // 3. Write log
      await this.createLogEntry({
        userId: userData.uid,
        userName: userData.displayName,
        roomNumber,
        entryMethod: 'qr'
      });

      return { success: true, message: `Thank you for using Room ${roomNumber}`, userName: userData.displayName };
    } catch (error) {
      if (retryCount < 2 && error instanceof Error && error.message.includes('offline')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.logByUniversityId(universityId, roomNumber, retryCount + 1);
      }
      if (error instanceof Error && error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      console.error("Error logging by QR:", error);
      return { success: false, message: "An error occurred during scanning." };
    }
  },

  /**
   * Logs usage for a user who is already authenticated via Firebase Auth
   */
  async logByAuthUser(profile: UserProfile, roomNumber: string): Promise<LogResult> {
    try {
      if (profile.isBlocked) {
        return { success: false, message: "Access denied. Your account is blocked." };
      }

      await this.createLogEntry({
        userId: profile.uid,
        userName: profile.displayName,
        roomNumber,
        entryMethod: 'email'
      });

      return { success: true, message: `Thank you for using Room ${roomNumber}`, userName: profile.displayName };
    } catch (error) {
      console.error("Error logging by Email:", error);
      return { success: false, message: "An error occurred during logging." };
    }
  },

  /**
   * Logs usage by looking up a user by their Email
   */
  async logByEmail(email: string, roomNumber: string, retryCount = 0): Promise<LogResult> {
    const path = 'users';
    const normalizedEmail = email.toLowerCase().trim();
    try {
      // 1. Find the user with this email
      const usersRef = collection(db, path);
      const q = query(usersRef, where('email', '==', normalizedEmail), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, message: "Professor email not found in system." };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as UserProfile;

      // 2. Check if blocked
      if (userData.isBlocked) {
        return { success: false, message: "Access denied. This account is blocked." };
      }

      // 3. Write log
      await this.createLogEntry({
        userId: userData.uid,
        userName: userData.displayName,
        roomNumber,
        entryMethod: 'email'
      });

      return { success: true, message: `Thank you for using Room ${roomNumber}`, userName: userData.displayName };
    } catch (error) {
      if (retryCount < 2 && error instanceof Error && error.message.includes('offline')) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.logByEmail(email, roomNumber, retryCount + 1);
      }
      if (error instanceof Error && error.message.includes('insufficient permissions')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      console.error("Error logging by Email:", error);
      return { success: false, message: "An error occurred during manual entry." };
    }
  },

  /**
   * Internal helper to create the log document
   */
  async createLogEntry(data: { userId: string, userName: string, roomNumber: string, entryMethod: EntryMethod }) {
    const path = 'logs';
    try {
      const logsRef = collection(db, path);
      await addDoc(logsRef, {
        ...data,
        timestamp: new Date().toISOString() // Using ISO string as per previous schema, or could use serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }
};
