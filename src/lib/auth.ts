// src/lib/auth.ts

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
  import { createUser, getUser, updateUser } from './database';
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
  
  // Sign in organizer
  export const signInOrganizer = async (email: string, password: string): Promise<User> => {
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time
      await updateUser(firebaseUser.uid, { lastLoginAt: new Date() });
      
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
  
  // Sign in anonymously (for event attendees)
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
  
  // Create attendee account (converts guest to registered user)
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
  
  // Check if user is anonymous (guest)
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