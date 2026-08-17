import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInAnonymously,
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreService';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoUrl: string;
  role: 'student' | 'admin' | 'moderator' | 'faculty';
  roles?: string[]; // Support multiple roles
  bio?: string;
  school?: string;
  town?: string;
  village?: string;
  phone?: string;
  socialHandle?: string;
  lastSeen?: any;
  status?: 'online' | 'offline';
  isMuted?: boolean;
  muteUntil?: any;
  cooldownUntil?: any;
  createdAt?: any;
}

const googleProvider = new GoogleAuthProvider();

export const authService = {
  async signInWithGoogle(): Promise<UserProfile> {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user profile to Firestore
    const userRef = doc(db, 'users', user.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
    
    let profile: UserProfile;
    const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'xavierscot3454@gmail.com').toLowerCase();
    const adminEmail1 = (import.meta.env.VITE_ADMIN_EMAIL_1 || '').toLowerCase();
    const adminEmail2 = (import.meta.env.VITE_ADMIN_EMAIL_2 || '').toLowerCase();
    const adminEmail3 = (import.meta.env.VITE_ADMIN_EMAIL_3 || 'dcpromoidse@gmail.com').toLowerCase();
    const isRootAdmin = (user.email || '').toLowerCase() === adminEmail || 
                       (user.email || '').toLowerCase() === adminEmail1 || 
                       (user.email || '').toLowerCase() === adminEmail2 ||
                       (user.email || '').toLowerCase() === adminEmail3;
    
    if (!userSnap?.exists()) {
      profile = {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        email: user.email || '',
        photoUrl: user.photoURL || '',
        role: isRootAdmin ? 'admin' : 'student',
        roles: isRootAdmin ? ['admin', 'student'] : ['student'],
        createdAt: serverTimestamp(),
        status: 'online',
        lastSeen: serverTimestamp()
      };
      try {
        await setDoc(userRef, profile);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    } else {
      profile = userSnap.data() as UserProfile;
      
      if (isRootAdmin && profile.role !== 'admin') {
        profile.role = 'admin';
        if (!profile.roles?.includes('admin')) {
          profile.roles = [...(profile.roles || []), 'admin'];
        }
      }
      
      // Update last seen and status
      try {
        await setDoc(userRef, { 
          status: 'online', 
          lastSeen: serverTimestamp(),
          role: profile.role,
          roles: profile.roles || [profile.role]
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    }
    
    return profile;
  },

  async signInAsGuest(displayName: string): Promise<UserProfile> {
    const result = await signInAnonymously(auth);
    const user = result.user;

    await updateProfile(user, { displayName });

    const userRef = doc(db, 'users', user.uid);
    const profile: UserProfile = {
      uid: user.uid,
      name: displayName,
      email: '',
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      role: 'student',
      createdAt: serverTimestamp(),
      status: 'online',
      lastSeen: serverTimestamp()
    };
    
    try {
      await setDoc(userRef, profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
    return profile;
  },

  async signUpWithPhoneAndPassword(phone: string, password: string, name: string): Promise<UserProfile> {
    const email = `${phone}@phone.auth`;
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    await updateProfile(user, { displayName: name });
    
    const userRef = doc(db, 'users', user.uid);
    const profile: UserProfile = {
      uid: user.uid,
      name: name,
      email: email,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
      role: 'student',
      createdAt: serverTimestamp(),
      status: 'online',
      lastSeen: serverTimestamp()
    };
    
    try {
      await setDoc(userRef, profile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
    return profile;
  },

  async signInWithPhoneAndPassword(phone: string, password: string): Promise<UserProfile> {
    const email = `${phone}@phone.auth`;
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    const userRef = doc(db, 'users', user.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
    
    if (userSnap?.exists()) {
      const profile = userSnap.data() as UserProfile;
      try {
        await updateDoc(userRef, { 
          status: 'online', 
          lastSeen: serverTimestamp() 
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
      return profile;
    } else {
      // Fallback if profile missing
      const profile: UserProfile = {
        uid: user.uid,
        name: user.displayName || 'User',
        email: email,
        photoUrl: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        role: 'student',
        createdAt: serverTimestamp(),
        status: 'online',
        lastSeen: serverTimestamp()
      };
      try {
        await setDoc(userRef, profile);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
      return profile;
    }
  },

  async updateUserName(uid: string, newName: string) {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newName });
    }
    const userRef = doc(db, 'users', uid);
    try {
      await updateDoc(userRef, { name: newName });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async updateUserPhoto(uid: string, newPhotoUrl: string) {
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: newPhotoUrl });
    }
    const userRef = doc(db, 'users', uid);
    try {
      await updateDoc(userRef, { photoUrl: newPhotoUrl });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async updateUserProfile(uid: string, details: Partial<UserProfile>) {
    const userRef = doc(db, 'users', uid);
    try {
      await updateDoc(userRef, details);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  },

  async logout() {
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        // Do not await this so it doesn't block the actual sign out
        setDoc(userRef, { 
          status: 'offline', 
          lastSeen: serverTimestamp() 
        }, { merge: true }).catch(err => {
          console.error("Failed to update user status during logout:", err);
        });
      } catch (error) {
        console.error("Error initiating status update:", error);
      }
    }
    try {
      localStorage.removeItem('adminToken');
      await signOut(auth);
    } catch (error) {
      console.error("Firebase signOut error:", error);
      throw error;
    }
  },

  async signOut() {
    return this.logout();
  },

  onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  async getUserProfile(uid: string, email?: string | null): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
    
    if (userSnap?.exists()) {
      const profile = userSnap.data() as UserProfile;
      const userEmail = (profile.email || email || auth.currentUser?.email || '').toLowerCase();
      const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'xavierscot3454@gmail.com').toLowerCase();
      const adminEmail1 = (import.meta.env.VITE_ADMIN_EMAIL_1 || '').toLowerCase();
      const adminEmail2 = (import.meta.env.VITE_ADMIN_EMAIL_2 || '').toLowerCase();
      const adminEmail3 = (import.meta.env.VITE_ADMIN_EMAIL_3 || 'dcpromoidse@gmail.com').toLowerCase();
      if ((userEmail === adminEmail || userEmail === adminEmail1 || userEmail === adminEmail2 || userEmail === adminEmail3) && profile.role !== 'admin') {
        profile.role = 'admin';
        // Optionally update it in the database too
        await updateDoc(userRef, { role: 'admin' }).catch(() => {});
      }
      return profile;
    }
    return null;
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const usersRef = collection(db, 'users');
    try {
      const snapshot = await getDocs(usersRef);
      return snapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  listenToAllUsers(callback: (users: UserProfile[]) => void, onError?: (error: any) => void) {
    const usersRef = collection(db, 'users');
    return onSnapshot(usersRef, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
  },

  async ensureUserProfile(uid: string, email: string | null, name: string | null, photoUrl: string | null) {
    const path = `users/${uid}`;
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'xavierscot3454@gmail.com').toLowerCase();
        const adminEmail1 = (import.meta.env.VITE_ADMIN_EMAIL_1 || '').toLowerCase();
        const adminEmail2 = (import.meta.env.VITE_ADMIN_EMAIL_2 || '').toLowerCase();
        const adminEmail3 = (import.meta.env.VITE_ADMIN_EMAIL_3 || 'dcpromoidse@gmail.com').toLowerCase();
        const userEmail = (email || '').toLowerCase();
        const isRootAdmin = userEmail === adminEmail || 
                           userEmail === adminEmail1 || 
                           userEmail === adminEmail2 ||
                           userEmail === adminEmail3;

        const profile: UserProfile = {
          uid,
          name: name || 'Anonymous',
          email: email || '',
          photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
          role: isRootAdmin ? 'admin' : 'student',
          roles: isRootAdmin ? ['admin', 'student'] : ['student'],
          createdAt: serverTimestamp(),
          status: 'online',
          lastSeen: serverTimestamp()
        };
        await setDoc(userRef, profile);
        return profile;
      }
      return userSnap.data() as UserProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
