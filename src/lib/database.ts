// src/lib/database.ts
// Version: 3.2 - Added automatic event stats updates

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
  increment,
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

// Helper function to check if error is related to missing indexes
const isIndexError = (error: any): boolean => {
  return error?.code === 'failed-precondition' && 
         error?.message?.includes('query requires an index');
};

// Helper function to remove undefined values from objects (Firestore doesn't accept undefined)
const cleanUndefinedValues = (obj: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (Array.isArray(obj[key])) {
        // Handle arrays (like prompts)
        cleaned[key] = obj[key].map((item: any) => 
          item && typeof item === 'object' ? cleanUndefinedValues(item) : item
        );
      } else if (obj[key] && typeof obj[key] === 'object' && !(obj[key] instanceof Date)) {
        cleaned[key] = cleanUndefinedValues(obj[key]);
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned;
};

// Enhanced convertTimestamps function to preserve arrays
const convertTimestamps = <T>(data: T): T => {
  if (data && typeof data === 'object') {
    // Handle arrays properly - don't convert them to objects
    if (Array.isArray(data)) {
      return data.map(item => convertTimestamps(item)) as T;
    }
    
    const converted = { ...data } as Record<string, unknown>;
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = (converted[key] as Timestamp).toDate();
      } else if (converted[key] && typeof converted[key] === 'object') {
        // Check if it's an array before recursion
        if (Array.isArray(converted[key])) {
          // Keep arrays as arrays, just convert timestamps within them
          converted[key] = (converted[key] as any[]).map(item => convertTimestamps(item));
        } else {
          // Only recurse for non-array objects
          converted[key] = convertTimestamps(converted[key]);
        }
      }
    });
    return converted as T;
  }
  return data;
};

// ✅ NEW: Function to update event stats
const updateEventStats = async (eventId: string, updates: {
  participantsDelta?: number;
  postsDelta?: number;
  likesDelta?: number;
  commentsDelta?: number;
}): Promise<void> => {
  try {
    const eventDoc = doc(eventsCollection, eventId);
    const updateData: any = {};

    if (updates.participantsDelta) {
      updateData['stats.totalParticipants'] = increment(updates.participantsDelta);
    }
    if (updates.postsDelta) {
      updateData['stats.totalPosts'] = increment(updates.postsDelta);
    }
    if (updates.likesDelta) {
      updateData['stats.totalLikes'] = increment(updates.likesDelta);
    }
    if (updates.commentsDelta) {
      updateData['stats.totalComments'] = increment(updates.commentsDelta);
    }

    await updateDoc(eventDoc, updateData);
    console.log('✅ Updated event stats:', updates);
  } catch (error) {
    console.error('❌ Error updating event stats:', error);
    // Don't throw - stats update failure shouldn't break the main operation
  }
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
    console.log('📝 Input prompts:', eventData.prompts);
    console.log('📝 Validating prompts:', validatedPrompts);
    console.log('📝 Prompts count:', validatedPrompts.length);
    
    const docData = cleanUndefinedValues({
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
    });
    
    console.log('Creating event document with data:', docData);
    console.log('📋 Prompts in docData:', docData.prompts);
    console.log('📊 Cleaned prompts count:', docData.prompts?.length || 0);
    
    const eventDoc = await addDoc(eventsCollection, docData);
    
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

// Enhanced getEvent function with array restoration
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
      
      // Handle prompts array conversion properly
      let processedPrompts = rawData.prompts || [];
      
      // If prompts is an object with numeric keys, convert back to array
      if (processedPrompts && !Array.isArray(processedPrompts) && typeof processedPrompts === 'object') {
        const keys = Object.keys(processedPrompts);
        const isNumericKeys = keys.every(key => /^\d+$/.test(key));
        
        if (isNumericKeys) {
          console.log('🔧 Converting prompts object back to array');
          processedPrompts = keys
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => (processedPrompts as Record<string, any>)[key]);
          console.log('✅ Converted prompts array:', processedPrompts);
        }
      }
      
      // Now fix options within each prompt
      if (Array.isArray(processedPrompts)) {
        processedPrompts = processedPrompts.map((prompt: any) => {
          if (prompt && prompt.type === 'multipleChoice' && prompt.options) {
            // If options is an object with numeric keys, convert to array
            if (!Array.isArray(prompt.options) && typeof prompt.options === 'object') {
              const optionKeys = Object.keys(prompt.options);
              const isNumericOptionKeys = optionKeys.every(key => /^\d+$/.test(key));
              
              if (isNumericOptionKeys) {
                console.log('🔧 Converting prompt options object back to array for:', prompt.question);
                prompt.options = optionKeys
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map(key => prompt.options[key])
                  .filter(option => option && option.trim && option.trim() !== '');
                console.log('✅ Converted options array:', prompt.options);
              }
            }
          }
          return convertTimestamps(prompt);
        });
      }
      
      // Create the event data with proper array handling
      const eventDataWithId = { 
        ...rawData, 
        id: eventSnap.id,
        prompts: processedPrompts
      };
      
      // Convert other timestamps but preserve the prompts array
      const eventData = {
        ...convertTimestamps(eventDataWithId),
        prompts: processedPrompts // Keep the already processed prompts array
      } as Event;
      
      console.log('✅ Final processed event data:', eventData);
      
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
  try {
    const q = query(eventsCollection, where('eventUrl', '==', eventUrl), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const rawData = doc.data();
      
      // Handle prompts array conversion properly
      let processedPrompts = rawData.prompts || [];
      
      // If prompts is an object with numeric keys, convert back to array
      if (processedPrompts && !Array.isArray(processedPrompts) && typeof processedPrompts === 'object') {
        const keys = Object.keys(processedPrompts);
        const isNumericKeys = keys.every(key => /^\d+$/.test(key));
        
        if (isNumericKeys) {
          console.log('🔧 Converting prompts object back to array in getEventByUrl');
          processedPrompts = keys
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => (processedPrompts as Record<string, any>)[key]);
        }
      }
      
      // Fix options within each prompt
      if (Array.isArray(processedPrompts)) {
        processedPrompts = processedPrompts.map((prompt: any) => {
          if (prompt && prompt.type === 'multipleChoice' && prompt.options) {
            // If options is an object with numeric keys, convert to array
            if (!Array.isArray(prompt.options) && typeof prompt.options === 'object') {
              const optionKeys = Object.keys(prompt.options);
              const isNumericOptionKeys = optionKeys.every(key => /^\d+$/.test(key));
              
              if (isNumericOptionKeys) {
                console.log('🔧 Converting prompt options in getEventByUrl for:', prompt.question);
                prompt.options = optionKeys
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map(key => prompt.options[key])
                  .filter(option => option && option.trim && option.trim() !== '');
              }
            }
          }
          return convertTimestamps(prompt);
        });
      }
      
      // Create the event data with proper array handling (same as getEvent)
      const eventDataWithId = { 
        ...rawData, 
        id: doc.id,
        prompts: processedPrompts
      };
      
      // Convert other timestamps but preserve the prompts array
      const eventData = {
        ...convertTimestamps(eventDataWithId),
        prompts: processedPrompts // Keep the already processed prompts array
      } as Event;
      
      return eventData;
    }
    return null;
  } catch (error) {
    console.error('Error in getEventByUrl:', error);
    throw error;
  }
};

export const getUserEvents = async (organizerId: string): Promise<Event[]> => {
  try {
    const q = query(
      eventsCollection,
      where('organizerId', '==', organizerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const events = querySnapshot.docs.map(doc => 
      convertTimestamps({ ...doc.data(), id: doc.id } as Event)
    );
    
    console.log(`📋 Loaded ${events.length} events for organizer: ${organizerId}`);
    return events;
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 FIREBASE INDEX REQUIRED for getUserEvents!');
      console.error('Create index: organizerId (Ascending), createdAt (Descending)');
      
      // Fallback: get events without ordering
      try {
        const fallbackQuery = query(eventsCollection, where('organizerId', '==', organizerId));
        const querySnapshot = await getDocs(fallbackQuery);
        const events = querySnapshot.docs.map(doc => 
          convertTimestamps({ ...doc.data(), id: doc.id } as Event)
        );
        
        // Sort manually
        events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log(`📋 Loaded ${events.length} events (fallback) for organizer: ${organizerId}`);
        return events;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        throw error;
      }
    }
    
    console.error('Error in getUserEvents:', error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  const eventDoc = doc(eventsCollection, eventId);
  await updateDoc(eventDoc, { ...updates, updatedAt: new Date() });
};

// ✅ ENHANCED: Event Participant operations with stats updates
export const createEventParticipant = async (
  participantData: CreateParticipantData
): Promise<string> => {
  const docData = cleanUndefinedValues({
    ...participantData,
    joinedAt: new Date(),
    postsCount: 0,
    likesReceived: 0,
    commentsReceived: 0,
  });
  
  console.log('💾 Saving participant data (cleaned):', docData);
  const participantDoc = await addDoc(participantsCollection, docData);
  
  // ✅ Update event stats - increment participant count
  await updateEventStats(participantData.eventId, { participantsDelta: 1 });
  
  return participantDoc.id;
};

export const getEventParticipants = async (eventId: string): Promise<EventParticipant[]> => {
  try {
    const q = query(
      participantsCollection,
      where('eventId', '==', eventId),
      orderBy('joinedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc =>
      convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
    );
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 FIREBASE INDEX REQUIRED for getEventParticipants!');
      console.error('Create index: eventId (Ascending), joinedAt (Descending)');
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        console.error('Index URL:', (error as any).message.match(/https:\/\/[^\s]+/)?.[0]);
      }
      
      // Fallback: get participants without ordering
      try {
        const fallbackQuery = query(participantsCollection, where('eventId', '==', eventId));
        const querySnapshot = await getDocs(fallbackQuery);
        const participants = querySnapshot.docs.map(doc =>
          convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
        );
        
        // Sort manually by joinedAt
        participants.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
        
        console.log(`📋 Loaded ${participants.length} participants (fallback) for event: ${eventId}`);
        return participants;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        // Return empty array instead of throwing to prevent app crash
        return [];
      }
    }
    
    console.error('Error in getEventParticipants:', error);
    throw error;
  }
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

// ✅ ENHANCED: Post operations with stats updates
export const createPost = async (postData: CreatePostData): Promise<string> => {
  const docData = {
    ...postData,
    createdAt: new Date(),
    likesCount: 0,
    commentsCount: 0,
  };
  const postDoc = await addDoc(postsCollection, docData as any);
  
  // ✅ Update event stats - increment post count
  await updateEventStats(postData.eventId, { postsDelta: 1 });
  
  console.log('✅ Created post and updated event stats');
  return postDoc.id;
};

// ✅ NEW: Get all posts for admin (including unapproved ones)
export const getAllEventPosts = async (eventId: string): Promise<Post[]> => {
  try {
    const q = query(
      postsCollection,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc =>
      convertTimestamps({ ...doc.data(), id: doc.id } as Post)
    );
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 INDEX ERROR in getAllEventPosts - using fallback');
      
      // Fallback without ordering
      try {
        const fallbackQuery = query(postsCollection, where('eventId', '==', eventId));
        const querySnapshot = await getDocs(fallbackQuery);
        const posts = querySnapshot.docs.map(doc =>
          convertTimestamps({ ...doc.data(), id: doc.id } as Post)
        );
        
        // Sort manually by createdAt
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log(`📋 Loaded ${posts.length} posts (fallback) for admin: ${eventId}`);
        return posts;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
    
    console.error('Error in getAllEventPosts:', error);
    return [];
  }
};

export const getEventPosts = async (eventId: string): Promise<Post[]> => {
  try {
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
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 FIREBASE INDEX REQUIRED for getEventPosts!');
      console.error('Create index: eventId (Ascending), isApproved (Ascending), createdAt (Descending)');
      if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
        console.error('Index URL:', (error as any).message.match(/https:\/\/[^\s]+/)?.[0]);
      }
      
      // Fallback: get posts without complex ordering
      try {
        const fallbackQuery = query(
          postsCollection,
          where('eventId', '==', eventId),
          where('isApproved', '==', true)
        );
        const querySnapshot = await getDocs(fallbackQuery);
        const posts = querySnapshot.docs.map(doc =>
          convertTimestamps({ ...doc.data(), id: doc.id } as Post)
        );
        
        // Sort manually by createdAt
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        console.log(`📋 Loaded ${posts.length} posts (fallback) for event: ${eventId}`);
        return posts;
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        // Return empty array instead of throwing to prevent app crash
        return [];
      }
    }
    
    console.error('Error in getEventPosts:', error);
    throw error;
  }
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
  const commentDoc = await addDoc(commentsCollection, docData as any);
  
  // ✅ Update event stats - increment comment count
  await updateEventStats(commentData.eventId || '', { commentsDelta: 1 });
  
  return commentDoc.id;
};

export const getPostComments = async (postId: string): Promise<Comment[]> => {
  try {
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
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 INDEX ERROR in getPostComments - using fallback');
      
      // Fallback without ordering
      const fallbackQuery = query(
        commentsCollection,
        where('postId', '==', postId),
        where('isApproved', '==', true)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const comments = querySnapshot.docs.map(doc =>
        convertTimestamps({ ...doc.data(), id: doc.id } as Comment)
      );
      
      // Sort manually
      comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return comments;
    }
    
    console.error('Error in getPostComments:', error);
    return []; // Return empty array instead of throwing
  }
};

// Reaction operations
export const createReaction = async (reactionData: CreateReactionData): Promise<string> => {
  const docData = {
    ...reactionData,
    createdAt: new Date(),
  };
  const reactionDoc = await addDoc(reactionsCollection, docData as any);
  
  // ✅ Update event stats - increment like count  
  await updateEventStats(reactionData.eventId || '', { likesDelta: 1 });
  
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
  
  // Note: You might want to decrement event stats here too
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

// New functions for attendee experience
export const getUserEventParticipations = async (userId: string): Promise<EventParticipant[]> => {
  try {
    const q = query(
      participantsCollection,
      where('userId', '==', userId),
      orderBy('joinedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc =>
      convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
    );
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 INDEX ERROR in getUserEventParticipations - using fallback');
      
      // Fallback without ordering
      const fallbackQuery = query(participantsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(fallbackQuery);
      const participations = querySnapshot.docs.map(doc =>
        convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
      );
      
      // Sort manually
      participations.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
      return participations;
    }
    
    console.error('Error in getUserEventParticipations:', error);
    return [];
  }
};

export const getUserPostsInEvent = async (eventId: string, userId: string): Promise<Post[]> => {
  try {
    const q = query(
      postsCollection,
      where('eventId', '==', eventId),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc =>
      convertTimestamps({ ...doc.data(), id: doc.id } as Post)
    );
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 INDEX ERROR in getUserPostsInEvent - using fallback');
      
      // Fallback without ordering
      const fallbackQuery = query(
        postsCollection,
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const posts = querySnapshot.docs.map(doc =>
        convertTimestamps({ ...doc.data(), id: doc.id } as Post)
      );
      
      // Sort manually
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return posts;
    }
    
    console.error('Error in getUserPostsInEvent:', error);
    return [];
  }
};

/*
🔥 REQUIRED FIREBASE INDEXES:

1. Collection: events
   - organizerId (Ascending), createdAt (Descending)

2. Collection: eventParticipants  
   - eventId (Ascending), joinedAt (Descending)
   - userId (Ascending), joinedAt (Descending)

3. Collection: posts
   - eventId (Ascending), isApproved (Ascending), createdAt (Descending)
   - eventId (Ascending), userId (Ascending), createdAt (Descending)
   - eventId (Ascending), createdAt (Descending) ← NEW for admin album

4. Collection: comments
   - postId (Ascending), isApproved (Ascending), createdAt (Ascending)

To create these indexes, visit the Firebase Console:
https://console.firebase.google.com/project/syncin-event/firestore/indexes

Or use the specific URLs provided in the error messages when they occur.
*/