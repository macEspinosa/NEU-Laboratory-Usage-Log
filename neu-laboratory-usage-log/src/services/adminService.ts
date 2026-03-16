import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDocs,
  where,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UsageLog, UserProfile, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../utils/errorHelper';

/**
 * Service for Admin-related operations
 */
export const adminService = {
  /**
   * Subscribes to all logs ordered by timestamp
   */
  subscribeToLogs(callback: (logs: UsageLog[]) => void) {
    const path = 'logs';
    const q = query(collection(db, path), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsageLog));
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  /**
   * Subscribes to all users
   */
  subscribeToUsers(callback: (users: UserProfile[]) => void) {
    const path = 'users';
    return onSnapshot(collection(db, path), (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile));
      callback(users);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  /**
   * Toggles the blocked status of a user
   */
  async toggleUserBlockStatus(uid: string, currentStatus: boolean) {
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isBlocked: !currentStatus
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { success: false, error };
    }
  },

  /**
   * Updates a user's role
   */
  async updateUserRole(uid: string, newRole: UserRole) {
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role: newRole
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
      return { success: false, error };
    }
  },

  /**
   * Promotes a user to admin by their email address.
   * If the user doesn't exist yet, they are added to a pre-authorization list.
   */
  async promoteUserByEmail(email: string) {
    const usersPath = 'users';
    const preAuthPath = 'preauthorized_admins';
    try {
      // 1. Check if user already exists
      const q = query(collection(db, usersPath), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, usersPath, userDoc.id), {
          role: 'admin'
        });
        return { success: true, message: `Successfully promoted ${userDoc.data().displayName} to Admin.` };
      }

      // 2. If not, add to pre-authorized list
      // Use email as doc ID to prevent duplicates and make it easy to check
      const preAuthRef = doc(db, preAuthPath, email.toLowerCase());
      await setDoc(preAuthRef, {
        email: email.toLowerCase(),
        role: 'admin',
        createdAt: new Date().toISOString()
      });

      return { success: true, message: `User not found, but ${email} has been pre-authorized as an Admin. They will have access upon their first sign-in.` };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, usersPath);
      return { success: false, message: "An error occurred while promoting the user." };
    }
  },

  /**
   * Deletes a user profile
   */
  async deleteUser(uid: string) {
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      return { success: false, error };
    }
  },

  /**
   * Calculates dashboard statistics from a list of logs
   */
  calculateStats(logs: UsageLog[]) {
    if (logs.length === 0) {
      return {
        totalUsage: 0,
        mostActiveProfessor: 'N/A',
        activeRooms: 0
      };
    }

    // Total usage is just the length of the filtered list
    const totalUsage = logs.length;

    // Calculate most active professor
    const professorCounts: Record<string, number> = {};
    logs.forEach(log => {
      professorCounts[log.userName] = (professorCounts[log.userName] || 0) + 1;
    });

    let mostActiveProfessor = 'N/A';
    let maxCount = 0;
    Object.entries(professorCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostActiveProfessor = name;
      }
    });

    // Active rooms
    const activeRooms = new Set(logs.map(l => l.roomNumber)).size;

    return {
      totalUsage,
      mostActiveProfessor,
      activeRooms
    };
  }
};
