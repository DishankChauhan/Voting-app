import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
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
  orderBy,
  deleteDoc,
  arrayUnion,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { ProposalData } from '@/lib/contractConfig';
import logger from '@/utils/logger';

// Firebase auth functions
export const registerUser = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update user profile with display name
    await updateProfile(userCredential.user, { displayName });
    
    // Save additional user data to Firestore
    await saveUserProfile(email.toLowerCase(), {
      displayName,
      email,
      createdAt: serverTimestamp(),
      walletAddresses: []
    });
    
    // Store user data in localStorage for client-side auth
    localStorage.setItem('firebase-user', JSON.stringify(userCredential.user));
    
    // Set auth token cookie for server-side authentication
    document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    
    logger.debug('User registered successfully, auth token set');
    return userCredential.user;
  } catch (error) {
    logger.error('Error registering user:', error);
    throw error;
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Store user data in localStorage for client-side auth
    localStorage.setItem('firebase-user', JSON.stringify(userCredential.user));
    
    // Set auth token cookie for server-side authentication
    document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
    
    logger.debug('User logged in successfully, auth token set');
    return userCredential.user;
  } catch (error) {
    logger.error('Error logging in:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    logger.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Define proposal type for Firebase storage
interface FirebaseProposal {
  id: number;
  title: string;
  description: string;
  creator: string;
  createdAt: Date;
  additionalData?: Record<string, any>;
}

// Define comment type
interface ProposalComment {
  id?: string;
  proposalId: number;
  author: string;
  content: string;
  createdAt: Date;
}

// Collection references
const PROPOSALS_COLLECTION = 'proposals';
const USERS_COLLECTION = 'users';
const COMMENTS_COLLECTION = 'comments';

// Save proposal metadata to Firebase
export const saveProposalToFirebase = async (proposalData: Partial<ProposalData>) => {
  try {
    if (!proposalData.id) {
      throw new Error('Proposal ID is required');
    }
    
    const proposalRef = doc(db, PROPOSALS_COLLECTION, proposalData.id.toString());
    
    // Add timestamp for when the proposal was saved to Firebase
    const dataToSave = {
      ...proposalData,
      metadata: {
        createdAt: serverTimestamp(),
      }
    };
    
    await setDoc(proposalRef, dataToSave);
    return true;
  } catch (error) {
    logger.error('Error saving proposal to Firebase:', error);
    throw error;
  }
};

// Get proposal metadata from Firebase
export const getProposalFromFirebase = async (proposalId: number) => {
  try {
    const proposalRef = doc(db, PROPOSALS_COLLECTION, proposalId.toString());
    const proposalSnap = await getDoc(proposalRef);
    
    if (proposalSnap.exists()) {
      return proposalSnap.data() as ProposalData;
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting proposal from Firebase:', error);
    throw error;
  }
};

// Add a comment to a proposal
export const addCommentToProposal = async (
  proposalId: number, 
  userAddress: string, 
  commentText: string
) => {
  try {
    const proposalRef = doc(db, PROPOSALS_COLLECTION, proposalId.toString());
    const proposalSnap = await getDoc(proposalRef);
    
    if (!proposalSnap.exists()) {
      throw new Error('Proposal not found in Firebase');
    }
    
    const comment = {
      user: userAddress,
      text: commentText,
      timestamp: serverTimestamp()
    };
    
    await updateDoc(proposalRef, {
      'metadata.comments': arrayUnion(comment)
    });
    
    return true;
  } catch (error) {
    logger.error('Error adding comment to proposal:', error);
    throw error;
  }
};

// Get comments for a proposal
export const getCommentsForProposal = async (proposalId: number) => {
  try {
    const commentsCollection = collection(db, 'comments');
    const q = query(
      commentsCollection,
      where('proposalId', '==', proposalId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    const comments: ProposalComment[] = [];
    
    querySnapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data(),
      } as ProposalComment);
    });
    
    return comments;
  } catch (error) {
    logger.error('Error getting comments:', error);
    throw error;
  }
};

// Get user profile from Firebase
export const getUserProfile = async (userAddress: string) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userAddress.toLowerCase());
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting user profile:', error);
    throw error;
  }
};

// Save or update user profile
export const saveUserProfile = async (userAddress: string, profileData: any) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userAddress.toLowerCase());
    
    await setDoc(userRef, {
      ...profileData,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    logger.error('Error saving user profile:', error);
    throw error;
  }
};

// Store proposal voting analytics
export const updateProposalAnalytics = async (
  proposalId: number,
  data: Record<string, any>
) => {
  try {
    const analyticsRef = doc(db, 'proposalAnalytics', proposalId.toString());
    await setDoc(analyticsRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    logger.error('Error updating proposal analytics:', error);
    throw error;
  }
}; 