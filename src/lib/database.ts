// src/lib/database.ts
// Version: 2.1 - Added prompts validation and debugging

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  CollectionReference,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Event,
  EventParticipant,
  Post,
  Comment,
  Reaction,
  CreateUserData,
  CreateEventData,
  CreateParticipantData,
  CreatePostData,
  CreateCommentData,
  CreateReactionData,
} from '@/types';

// Collection references
export const usersCollection = collection(db, 'users') as CollectionReference<User>;
export const eventsCollection = collection(db, 'events') as CollectionReference<Event>;
export const participantsCollection = collection(db, 'eventParticipants') as CollectionReference<EventParticipant>;
export const postsCollection = collection(db, 'posts') as CollectionReference<Post>;
export const commentsCollection = collection(db, 'comments') as CollectionReference<Comment>;
export const reactionsCollection = collection(db, 'reactions') as CollectionReference<Reaction>;

// Helper function to convert Firestore timestamps to Date objects
const convertTimestamps = <T>(data: T): T => {
  if (data && typeof data === 'object') {
    const converted = { ...data } as Record<string, unknown>;
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = (converted[key] as Timestamp).toDate();
      } else if (converted[key] && typeof converted[key] === 'object') {
        converted[key] = convertTimestamps(converted[key]);
      }
    });
    return converted as T;
  }
  return data;
};

// User operations
export const createUser = async (userId: string, userData: CreateUserData): Promise<void> => {
  const userDoc = doc(usersCollection, userId);
  await setDoc(userDoc, {
    ...userData,
    id: userId,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  });
};

export const getUser = async (userId: string): Promise<User | null> => {
  const userDoc = doc(usersCollection, userId);
  const userSnap = await getDoc(userDoc);
  if (userSnap.exists()) {
    return convertTimestamps({ ...userSnap.data(), id: userSnap.id } as User);
  }
  return null;
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  const userDoc = doc(usersCollection, userId);
  await updateDoc(userDoc, updates);
};

// Event operations
export const createEvent = async (eventData: CreateEventData): Promise<string> => {
  try {
    // Validate prompts array
    const validatedPrompts = Array.isArray(eventData.prompts) ? eventData.prompts : [];
    console.log('📝 Validating prompts:', validatedPrompts);
    
    const docData = {
      ...eventData,
      prompts: validatedPrompts, // Ensure prompts is always an array
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalParticipants: 0,
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
      },
    };
    
    console.log('Creating event document with data:', docData);
    console.log('📋 Prompts in docData:', docData.prompts);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventDoc = await addDoc(eventsCollection, docData as any);
    
    console.log('Event document created with ID:', eventDoc.id);
    
    if (!eventDoc.id || eventDoc.id.trim() === '') {
      throw new Error('Failed to get document ID after creation');
    }
    
    return eventDoc.id;
  } catch (error) {
    console.error('Error in createEvent:', error);
    throw error;
  }
};

export const getEvent = async (eventId: string): Promise<Event | null> => {
  try {
    console.log('getEvent called with eventId:', eventId);
    
    // Validate eventId
    if (!eventId || eventId.trim() === '') {
      throw new Error('Event ID is empty or invalid');
    }
    
    const eventDoc = doc(eventsCollection, eventId);
    const eventSnap = await getDoc(eventDoc);
    
    if (eventSnap.exists()) {
      const rawData = eventSnap.data();
      console.log('📄 Raw event data from Firestore:', rawData);
      console.log('📝 Raw prompts field:', rawData.prompts, 'Type:', typeof rawData.prompts, 'Array?:', Array.isArray(rawData.prompts));
      
      // Ensure prompts is always an array
      const eventDataWithId = { 
        ...rawData, 
        id: eventSnap.id,
        prompts: Array.isArray(rawData.prompts) ? rawData.prompts : []
      };
      
      const eventData = convertTimestamps(eventDataWithId as Event);
      console.log('✅ Processed event data:', eventData);
      console.log('📋 Final prompts field:', eventData.prompts, 'Array?:', Array.isArray(eventData.prompts));
      
      return eventData;
    } else {
      console.log('Event document does not exist');
      return null;
    }
  } catch (error) {
    console.error('Error in getEvent:', error);
    throw error;
  }
};

export const getEventByUrl = async (eventUrl: string): Promise<Event | null> => {
  const q = query(eventsCollection, where('eventUrl', '==', eventUrl), limit(1));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return convertTimestamps({ ...doc.data(), id: doc.id } as Event);
  }
  return null;
};

export const getUserEvents = async (organizerId: string): Promise<Event[]> => {
  const q = query(
    eventsCollection,
    where('organizerId', '==', organizerId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => 
    convertTimestamps({ ...doc.data(), id: doc.id } as Event)
  );
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  const eventDoc = doc(eventsCollection, eventId);
  await updateDoc(eventDoc, { ...updates, updatedAt: new Date() });
};

// Event Participant operations
export const createEventParticipant = async (
  participantData: CreateParticipantData
): Promise<string> => {
  const docData = {
    ...participantData,
    joinedAt: new Date(),
    postsCount: 0,
    likesReceived: 0,
    commentsReceived: 0,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participantDoc = await addDoc(participantsCollection, docData as any);
  return participantDoc.id;
};

export const getEventParticipants = async (eventId: string): Promise<EventParticipant[]> => {
  const q = query(
    participantsCollection,
    where('eventId', '==', eventId),
    orderBy('joinedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc =>
    convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
  );
};

export const getParticipantByUser = async (
  eventId: string,
  userId: string
): Promise<EventParticipant | null> => {
  const q = query(
    participantsCollection,
    where('eventId', '==', eventId),
    where('userId', '==', userId),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant);
  }
  return null;
};

export const updateParticipant = async (
  participantId: string,
  updates: Partial<EventParticipant>
): Promise<void> => {
  const participantDoc = doc(participantsCollection, participantId);
  await updateDoc(participantDoc, updates);
};

// Post operations
export const createPost = async (postData: CreatePostData): Promise<string> => {
  const docData = {
    ...postData,
    createdAt: new Date(),
    likesCount: 0,
    commentsCount: 0,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postDoc = await addDoc(postsCollection, docData as any);
  return postDoc.id;
};

export const getEventPosts = async (eventId: string): Promise<Post[]> => {
  const q = query(
    postsCollection,
    where('eventId', '==', eventId),
    where('isApproved', '==', true),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc =>
    convertTimestamps({ ...doc.data(), id: doc.id } as Post)
  );
};

export const getPost = async (postId: string): Promise<Post | null> => {
  const postDoc = doc(postsCollection, postId);
  const postSnap = await getDoc(postDoc);
  if (postSnap.exists()) {
    return convertTimestamps({ ...postSnap.data(), id: postSnap.id } as Post);
  }
  return null;
};

export const updatePost = async (postId: string, updates: Partial<Post>): Promise<void> => {
  const postDoc = doc(postsCollection, postId);
  await updateDoc(postDoc, { ...updates, updatedAt: new Date() });
};

// Comment operations
export const createComment = async (commentData: CreateCommentData): Promise<string> => {
  const docData = {
    ...commentData,
    createdAt: new Date(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const commentDoc = await addDoc(commentsCollection, docData as any);
  return commentDoc.id;
};

export const getPostComments = async (postId: string): Promise<Comment[]> => {
  const q = query(
    commentsCollection,
    where('postId', '==', postId),
    where('isApproved', '==', true),
    orderBy('createdAt', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc =>
    convertTimestamps({ ...doc.data(), id: doc.id } as Comment)
  );
};

// Reaction operations
export const createReaction = async (reactionData: CreateReactionData): Promise<string> => {
  const docData = {
    ...reactionData,
    createdAt: new Date(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reactionDoc = await addDoc(reactionsCollection, docData as any);
  return reactionDoc.id;
};

export const getUserReaction = async (
  postId: string,
  participantId: string
): Promise<Reaction | null> => {
  const q = query(
    reactionsCollection,
    where('postId', '==', postId),
    where('participantId', '==', participantId),
    limit(1)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return convertTimestamps({ ...doc.data(), id: doc.id } as Reaction);
  }
  return null;
};

export const deleteReaction = async (reactionId: string): Promise<void> => {
  const reactionDoc = doc(reactionsCollection, reactionId);
  await deleteDoc(reactionDoc);
};

// Utility function to generate unique event URLs
export const generateUniqueEventUrl = async (baseTitle: string): Promise<string> => {
  const baseUrl = baseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  let eventUrl = baseUrl;
  let counter = 1;
  
  // Check if URL already exists
  while (await getEventByUrl(eventUrl)) {
    eventUrl = `${baseUrl}-${counter}`;
    counter++;
  }
  
  return eventUrl;
};