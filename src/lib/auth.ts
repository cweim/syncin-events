// src/lib/auth.ts
// Version: 2.0 - Enhanced auth with profile management for attendee experience

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUser, getUser, updateUser as updateUserInDb, propagateDisplayNameToParticipations } from './database';
import { User, CreateUserData } from '@/types';

// Auth state management
export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Register new organizer
export const registerOrganizer = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    // Create Firebase Auth user
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update Firebase Auth profile
    await updateProfile(firebaseUser, { displayName });
    
    // Create user document in Firestore
    const userData: CreateUserData = {
      email: firebaseUser.email!,
      displayName,
      role: 'organizer',
      eventsOrganized: 0,
      eventsAttended: 0,
    };
    
    await createUser(firebaseUser.uid, userData);
    
    // Get and return the complete user data
    const newUser = await getUser(firebaseUser.uid);
    if (!newUser) {
      throw new Error('Failed to create user document');
    }
    
    return newUser;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
    throw new Error(errorMessage);
  }
};

// Sign in organizer or attendee
export const signInOrganizer = async (email: string, password: string): Promise<User> => {
  try {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login time
    await updateUserInDb(firebaseUser.uid, { lastLoginAt: new Date() });
    
    // Get user data from Firestore
    const user = await getUser(firebaseUser.uid);
    if (!user) {
      throw new Error('User data not found');
    }
    
    return user;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
    throw new Error(errorMessage);
  }
};

// Sign in anonymously (for event attendees - DEPRECATED, now use registerAttendee)
export const signInAsGuest = async (displayName: string): Promise<FirebaseUser> => {
  try {
    const { user: firebaseUser } = await signInAnonymously(auth);
    
    // Update display name for anonymous user
    await updateProfile(firebaseUser, { displayName });
    
    return firebaseUser;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign in as guest';
    throw new Error(errorMessage);
  }
};

// Create attendee account (for event participants)
export const registerAttendee = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(firebaseUser, { displayName });
    
    const userData: CreateUserData = {
      email: firebaseUser.email!,
      displayName,
      role: 'attendee',
      eventsOrganized: 0,
      eventsAttended: 0,
    };
    
    await createUser(firebaseUser.uid, userData);
    
    const newUser = await getUser(firebaseUser.uid);
    if (!newUser) {
      throw new Error('Failed to create user document');
    }
    
    return newUser;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to register attendee';
    throw new Error(errorMessage);
  }
};

// Update user profile (for onboarding and profile editing)
export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  try {
    // Filter out undefined values from updates
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    await updateUserInDb(userId, cleanUpdates);
    
    // If displayName is being updated, also update Firebase Auth profile and propagate to participations
    if (updates.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.displayName });
      
      // Propagate display name to all event participations
      try {
        await propagateDisplayNameToParticipations(userId, updates.displayName);
      } catch (error) {
        console.error('Warning: Failed to propagate display name to participations:', error);
        // Don't throw error to avoid breaking the profile update
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
    throw new Error(errorMessage);
  }
};

// Check if user has completed onboarding
export const hasCompletedOnboarding = async (userId: string): Promise<boolean> => {
  try {
    const user = await getUser(userId);
    if (!user) return false;
    
    // Check if user has required onboarding fields
    return !!(user.displayName && user.profilePhotoUrl);
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// ✅ ALSO FIX: getUserEventHistory function
export const getUserEventHistory = async (userId: string): Promise<string[]> => {
  try {
    const user = await getUser(userId);
    if (!user) return [];
    
    // ✅ FIXED: Handle non-array eventsAttendedIds
    if (user.eventsAttendedIds) {
      if (Array.isArray(user.eventsAttendedIds)) {
        return user.eventsAttendedIds;
      } else if (typeof user.eventsAttendedIds === 'object') {
        // Convert object to array
        return Object.values(user.eventsAttendedIds as Record<string, string>);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error getting user event history:', error);
    return [];
  }
};

// Add event to user's attendance history
export const addEventToUserHistory = async (userId: string, eventId: string): Promise<void> => {
  try {
    const user = await getUser(userId);
    if (!user) throw new Error('User not found');
    
    // ✅ FIXED: Ensure eventsAttendedIds is always an array
    let eventsAttendedIds: string[] = [];
    
    if (user.eventsAttendedIds) {
      // Handle case where it might be an object instead of array (Firestore conversion issue)
      if (Array.isArray(user.eventsAttendedIds)) {
        eventsAttendedIds = user.eventsAttendedIds;
      } else if (typeof user.eventsAttendedIds === 'object') {
        // Convert object to array (in case Firestore converted it)
        eventsAttendedIds = Object.values(user.eventsAttendedIds as Record<string, string>);
      } else {
        console.warn('eventsAttendedIds is not array or object:', typeof user.eventsAttendedIds);
        eventsAttendedIds = [];
      }
    }
    
    console.log('📋 Current eventsAttendedIds:', eventsAttendedIds);
    console.log('📋 Is array?:', Array.isArray(eventsAttendedIds));
    console.log('📋 Adding eventId:', eventId);
    
    // Check if event is already in the array
    if (!eventsAttendedIds.includes(eventId)) {
      eventsAttendedIds.push(eventId);
      
      await updateUserInDb(userId, { 
        eventsAttendedIds,
        eventsAttended: eventsAttendedIds.length 
      });
      
      console.log('✅ Added event to user history:', eventId);
    } else {
      console.log('ℹ️ Event already in user history:', eventId);
    }
  } catch (error: unknown) {
    console.error('💥 Error updating user history:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user history';
    throw new Error(errorMessage);
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
    throw new Error(errorMessage);
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Check if user is anonymous (guest) - DEPRECATED
export const isAnonymous = (): boolean => {
  return !!auth.currentUser?.isAnonymous;
};

// Get current Firebase user
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Authentication state listener for React components
export const useAuthState = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};