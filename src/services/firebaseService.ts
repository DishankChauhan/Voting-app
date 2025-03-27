import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
  updateProfile,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// User Interface
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  walletAddress?: string;
  createdAt: Date | Timestamp;
}

// Proposal Metadata Interface
export interface ProposalMetadata {
  id: string;
  proposalId: number; // ID on blockchain
  createdBy: string; // User UID
  creatorEmail: string;
  walletAddress: string;
  createdAt: Date | Timestamp;
  additionalInfo?: string;
  category?: string;
  tags?: string[];
}

// Register a new user
export const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    
    // Update user profile with display name
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      
      // Store additional user info in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
      });
    }
    
    return userCredential;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
};

// Sign in a user
export const signInUser = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error signing in user:', error);
    throw error;
  }
};

// Sign out the current user
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out user:', error);
    throw error;
  }
};

// Get the current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Listen for auth state changes
export const onAuthChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Update user wallet address
export const updateUserWalletAddress = async (
  uid: string,
  walletAddress: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { walletAddress });
  } catch (error) {
    console.error('Error updating user wallet address:', error);
    throw error;
  }
};

// Store proposal metadata
export const storeProposalMetadata = async (
  proposalId: number,
  creatorUid: string,
  creatorEmail: string,
  walletAddress: string,
  additionalInfo?: string,
  category?: string,
  tags?: string[]
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'proposals'), {
      proposalId,
      createdBy: creatorUid,
      creatorEmail,
      walletAddress,
      createdAt: serverTimestamp(),
      additionalInfo,
      category,
      tags,
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error storing proposal metadata:', error);
    throw error;
  }
};

// Get proposals created by a user
export const getUserProposals = async (uid: string): Promise<ProposalMetadata[]> => {
  try {
    const q = query(collection(db, 'proposals'), where('createdBy', '==', uid));
    const querySnapshot = await getDocs(q);
    
    const proposals: ProposalMetadata[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      proposals.push({
        id: doc.id,
        proposalId: data.proposalId,
        createdBy: data.createdBy,
        creatorEmail: data.creatorEmail,
        walletAddress: data.walletAddress,
        createdAt: data.createdAt,
        additionalInfo: data.additionalInfo,
        category: data.category,
        tags: data.tags,
      });
    });
    
    return proposals;
  } catch (error) {
    console.error('Error getting user proposals:', error);
    throw error;
  }
}; 