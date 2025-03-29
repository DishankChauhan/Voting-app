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
  writeBatch,
  limit,
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

// Delegation type definition
export interface Delegation {
  delegator: string;     // Address of the user delegating votes
  delegatee: string;     // Address receiving the delegated votes
  amount: string;        // Amount of votes delegated
  active: boolean;       // Whether the delegation is currently active
  timestamp: number;     // When the delegation was created/updated
}

// Notification types
export enum NotificationType {
  PROPOSAL_CREATED = 'PROPOSAL_CREATED',
  PROPOSAL_VOTE = 'PROPOSAL_VOTE',
  PROPOSAL_EXECUTED = 'PROPOSAL_EXECUTED',
  PROPOSAL_CANCELED = 'PROPOSAL_CANCELED',
  PROPOSAL_EXPIRED = 'PROPOSAL_EXPIRED',
  DELEGATION_RECEIVED = 'DELEGATION_RECEIVED',
  DELEGATION_REMOVED = 'DELEGATION_REMOVED',
  TOKEN_RECEIVED = 'TOKEN_RECEIVED',
  PROPOSAL_NO_VOTES = 'PROPOSAL_NO_VOTES'
}

// Notification interface
export interface Notification {
  id?: string;                // Auto-generated ID
  userId: string;             // Address of the user receiving the notification
  type: NotificationType;     // Type of notification
  title: string;              // Notification title
  message: string;            // Notification message
  linkUrl?: string;           // Optional URL to redirect to when clicked
  read: boolean;              // Whether the notification has been read
  timestamp: number;          // When the notification was created
  data?: any;                 // Additional data related to the notification
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

/**
 * Save or update a delegation in Firebase
 * @param delegation The delegation data to save
 */
export const saveDelegation = async (delegation: Delegation): Promise<void> => {
  try {
    // Normalize addresses to lowercase for consistency
    const normalizedDelegation = {
      ...delegation,
      delegator: delegation.delegator.toLowerCase(),
      delegatee: delegation.delegatee.toLowerCase()
    };

    const delegationRef = doc(db, 'delegations', normalizedDelegation.delegator);
    await setDoc(delegationRef, normalizedDelegation);
  } catch (error) {
    console.error('Error saving delegation:', error);
    throw error;
  }
};

/**
 * Get an active delegation for a delegator
 * @param delegatorAddress The address of the delegator
 * @returns The delegation data or null if not found
 */
export const getDelegationByDelegator = async (delegatorAddress: string): Promise<Delegation | null> => {
  try {
    const delegationRef = doc(db, 'delegations', delegatorAddress.toLowerCase());
    const delegationSnap = await getDoc(delegationRef);

    if (delegationSnap.exists()) {
      return delegationSnap.data() as Delegation;
    }
    return null;
  } catch (error) {
    console.error('Error getting delegation:', error);
    throw error;
  }
};

/**
 * Get all delegations to a specific delegatee
 * @param delegateeAddress The address of the delegatee
 * @returns Array of active delegations
 */
export const getDelegationsToAddress = async (delegateeAddress: string): Promise<Delegation[]> => {
  try {
    const delegationsCollection = collection(db, 'delegations');
    const q = query(
      delegationsCollection, 
      where('delegatee', '==', delegateeAddress.toLowerCase()),
      where('active', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const delegations: Delegation[] = [];
    
    querySnapshot.forEach((doc) => {
      delegations.push(doc.data() as Delegation);
    });
    
    return delegations;
  } catch (error) {
    console.error('Error getting delegations to address:', error);
    throw error;
  }
};

/**
 * Get all active delegations
 * @returns Array of all active delegations
 */
export const getAllActiveDelegations = async (): Promise<Delegation[]> => {
  try {
    const delegationsCollection = collection(db, 'delegations');
    const q = query(delegationsCollection, where('active', '==', true));
    
    const querySnapshot = await getDocs(q);
    const delegations: Delegation[] = [];
    
    querySnapshot.forEach((doc) => {
      delegations.push(doc.data() as Delegation);
    });
    
    return delegations;
  } catch (error) {
    console.error('Error getting all active delegations:', error);
    throw error;
  }
};

/**
 * Create a new notification for a user
 * @param notification The notification data
 * @returns The created notification with ID
 */
export const createNotification = async (notification: Omit<Notification, 'id'>): Promise<Notification> => {
  try {
    const notificationsCollection = collection(db, 'notifications');
    
    // Create a new document with auto-generated ID
    const docRef = await addDoc(notificationsCollection, {
      ...notification,
      read: false,
      timestamp: Date.now()
    });
    
    return {
      id: docRef.id,
      ...notification,
      read: false,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get all notifications for a user
 * @param userId The user address
 * @param limitCount Optional limit on number of notifications to return
 * @returns Array of user notifications, sorted by newest first
 */
export const getUserNotifications = async (userId: string, limitCount?: number): Promise<Notification[]> => {
  try {
    const notificationsCollection = collection(db, 'notifications');
    let q = query(
      notificationsCollection,
      where('userId', '==', userId.toLowerCase()),
      orderBy('timestamp', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    
    querySnapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      } as Notification);
    });
    
    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 * @param notificationId The ID of the notification
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications for a user as read
 * @param userId The user address
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const notificationsCollection = collection(db, 'notifications');
    const q = query(
      notificationsCollection,
      where('userId', '==', userId.toLowerCase()),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 * @param notificationId The ID of the notification
 */
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Create a notification for a proposal with no votes
 * @param proposalId The ID of the proposal
 * @param proposalTitle The title of the proposal
 * @param proposerAddress The address of the proposal creator
 */
export const createNoVotesNotification = async (
  proposalId: number,
  proposalTitle: string,
  proposerAddress: string
): Promise<void> => {
  try {
    await createNotification({
      userId: proposerAddress.toLowerCase(),
      type: NotificationType.PROPOSAL_NO_VOTES,
      title: 'No Votes on Your Proposal',
      message: `Your proposal "${proposalTitle}" has not received any votes. Consider withdrawing it.`,
      linkUrl: `/proposals/${proposalId}`,
      read: false,
      timestamp: Date.now(),
      data: { proposalId }
    });
  } catch (error) {
    console.error('Error creating no votes notification:', error);
    throw error;
  }
};

// Update proposal with quadratic voting data
export interface ProposalVote {
  voter: string;
  support: number;
  weight: number;
  timestamp: number;
}

/**
 * Update proposal votes using quadratic voting
 * @param updatedProposal The updated proposal data with new vote
 */
export const updateProposalVotes = async (updatedProposal: ProposalData & { votes?: ProposalVote[] }): Promise<void> => {
  try {
    const proposalRef = doc(db, PROPOSALS_COLLECTION, updatedProposal.id.toString());
    
    // Make sure votes exist in the data structure
    const votes = updatedProposal.votes || [];
    
    await updateDoc(proposalRef, {
      forVotes: updatedProposal.forVotes,
      againstVotes: updatedProposal.againstVotes,
      abstainVotes: updatedProposal.abstainVotes,
      votes: votes
    });
    
    logger.debug(`Updated votes for proposal ${updatedProposal.id}`);
  } catch (error) {
    logger.error('Error updating proposal votes:', error);
    throw error;
  }
}; 