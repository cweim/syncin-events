// src/lib/database.ts
// Version: 5.0 - Array-based likes like React Native + simplified reactions

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
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  Event,
  EventParticipant,
  Post,
  Comment,
  CreateUserData,
  CreateEventData,
  CreateParticipantData,
  CreatePostData,
  CreateCommentData,
} from '@/types';

// Collection references
export const usersCollection = collection(db, 'users') as CollectionReference<User>;
export const eventsCollection = collection(db, 'events') as CollectionReference<Event>;
export const participantsCollection = collection(db, 'eventParticipants') as CollectionReference<EventParticipant>;
export const postsCollection = collection(db, 'posts') as CollectionReference<Post>;
export const commentsCollection = collection(db, 'comments') as CollectionReference<Comment>;

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

// ✅ SIMPLIFIED: Function to update event stats
const updateEventStats = async (eventId: string, updates: {
  participantsDelta?: number;
  postsDelta?: number;
  likesDelta?: number;
  commentsDelta?: number;
}): Promise<void> => {
  try {
    const eventDoc = doc(eventsCollection, eventId);
    const updateData: any = {};

    if (updates.participantsDelta !== undefined && updates.participantsDelta !== 0) {
      updateData['stats.totalParticipants'] = increment(updates.participantsDelta);
    }
    if (updates.postsDelta !== undefined && updates.postsDelta !== 0) {
      updateData['stats.totalPosts'] = increment(updates.postsDelta);
    }
    if (updates.likesDelta !== undefined && updates.likesDelta !== 0) {
      updateData['stats.totalLikes'] = increment(updates.likesDelta);
    }
    if (updates.commentsDelta !== undefined && updates.commentsDelta !== 0) {
      updateData['stats.totalComments'] = increment(updates.commentsDelta);
    }

    if (Object.keys(updateData).length > 0) {
      await updateDoc(eventDoc, updateData);
      console.log('✅ Updated event stats successfully:', updates);
    }
  } catch (error) {
    console.error('❌ Error updating event stats:', error);
    // Don't throw - stats update failure shouldn't break the main operation
  }
};

// ✅ ENHANCED: Update participant status when they post
export const updateParticipantPostStatus = async (
  eventId: string, 
  userId: string, 
  postApproved: boolean = true
): Promise<void> => {
  try {
    // Find the participant
    const participant = await getParticipantByUser(eventId, userId);
    if (!participant) {
      console.error('❌ Participant not found for user:', userId);
      return;
    }

    // Update participant's post count and hasPosted status
    const updates: Partial<EventParticipant> = {
      postsCount: (participant.postsCount || 0) + 1,
      hasPosted: true,
      lastPostAt: new Date(),
    };

    // Only count towards stats if post is approved
    if (postApproved) {
      updates.approvedPostsCount = (participant.approvedPostsCount || 0) + 1;
    }

    await updateParticipant(participant.id, updates);
    console.log('✅ Updated participant post status:', updates);
  } catch (error) {
    console.error('❌ Error updating participant post status:', error);
    // Don't throw - this shouldn't break the post creation flow
  }
};

// ✅ UPDATED: Post creation with likes array initialization
export const createPost = async (postData: CreatePostData): Promise<string> => {
  try {
    // First, get the event to check moderation settings
    const event = await getEvent(postData.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // ✅ Determine approval status based on event settings
    const shouldAutoApprove = !event.moderationEnabled || !event.requiresApproval;
    
    // ✅ NEW: Initialize with empty likes array (like React Native)
    const docData = {
      ...postData,
      createdAt: new Date(),
      likes: [], // ✅ Initialize empty likes array
      likesCount: 0,
      commentsCount: 0,
      isApproved: shouldAutoApprove,
    };
    
    console.log('📝 Creating post with array-based likes');
    
    const postDoc = await addDoc(postsCollection, docData as any);
    
    // ✅ Update participant status immediately (regardless of approval)
    await updateParticipantPostStatus(postData.eventId, postData.userId, shouldAutoApprove);
    
    // ✅ Only update event stats if post is approved (or auto-approved)
    if (shouldAutoApprove) {
      await updateEventStats(postData.eventId, { postsDelta: 1 });
      console.log('✅ Created approved post and updated event stats');
    } else {
      console.log('📝 Created post pending approval - stats not updated yet');
    }
    
    return postDoc.id;
  } catch (error) {
    console.error('❌ Error creating post:', error);
    throw error;
  }
};

// ✅ NEW: Function to approve a post and update stats
export const approvePost = async (postId: string): Promise<void> => {
  try {
    const postDoc = doc(postsCollection, postId);
    const postSnap = await getDoc(postDoc);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const post = postSnap.data() as Post;
    
    if (post.isApproved) {
      console.log('Post already approved');
      return;
    }
    
    // Update post approval status
    await updateDoc(postDoc, { 
      isApproved: true,
      approvedAt: new Date()
    });
    
    // Update event stats now that post is approved
    await updateEventStats(post.eventId, { postsDelta: 1 });
    
    console.log('✅ Post approved and stats updated');
  } catch (error) {
    console.error('❌ Error approving post:', error);
    throw error;
  }
};

// ✅ SIMPLIFIED: Like/Unlike functions using array operations (like React Native)
export const likePost = async (postId: string, userId: string): Promise<void> => {
  try {
    const postRef = doc(postsCollection, postId);
    await updateDoc(postRef, {
      likes: arrayUnion(userId),
      likesCount: increment(1)
    });
    console.log('✅ Post liked using array operation');
  } catch (error) {
    console.error('❌ Error liking post:', error);
    throw error;
  }
};

export const unlikePost = async (postId: string, userId: string): Promise<void> => {
  try {
    const postRef = doc(postsCollection, postId);
    await updateDoc(postRef, {
      likes: arrayRemove(userId),
      likesCount: increment(-1)
    });
    console.log('✅ Post unliked using array operation');
  } catch (error) {
    console.error('❌ Error unliking post:', error);
    throw error;
  }
};

// ✅ NEW: Check if user has liked a post
export const hasUserLikedPost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const postDoc = doc(postsCollection, postId);
    const postSnap = await getDoc(postDoc);
    
    if (postSnap.exists()) {
      const post = postSnap.data() as Post;
      const likes = Array.isArray(post.likes) ? post.likes : [];
      return likes.includes(userId);
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error checking if user liked post:', error);
    return false;
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
    console.log('📝 Creating event with prompts:', validatedPrompts);
    
    const docData = cleanUndefinedValues({
      ...eventData,
      prompts: validatedPrompts,
      createdAt: new Date(),
      updatedAt: new Date(),
      stats: {
        totalParticipants: 0,
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
      },
    });
    
    const eventDoc = await addDoc(eventsCollection, docData);
    console.log('✅ Event created with ID:', eventDoc.id);
    
    return eventDoc.id;
  } catch (error) {
    console.error('❌ Error creating event:', error);
    throw error;
  }
};

// Enhanced getEvent function with array restoration
export const getEvent = async (eventId: string): Promise<Event | null> => {
  try {
    console.log('📄 Getting event:', eventId);
    
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
      
      // Create the event data with proper array handling
      const eventDataWithId = { 
        ...rawData, 
        id: eventSnap.id,
        prompts: processedPrompts
      };
      
      // Convert other timestamps but preserve the prompts array
      const eventData = {
        ...convertTimestamps(eventDataWithId),
        prompts: processedPrompts
      } as Event;
      
      console.log('✅ Final processed event data:', eventData);
      
      return eventData;
    } else {
      console.log('❌ Event document does not exist');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in getEvent:', error);
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
      
      // Handle prompts array conversion properly (same as getEvent)
      let processedPrompts = rawData.prompts || [];
      
      if (processedPrompts && !Array.isArray(processedPrompts) && typeof processedPrompts === 'object') {
        const keys = Object.keys(processedPrompts);
        const isNumericKeys = keys.every(key => /^\d+$/.test(key));
        
        if (isNumericKeys) {
          processedPrompts = keys
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(key => (processedPrompts as Record<string, any>)[key]);
        }
      }
      
      const eventDataWithId = { 
        ...rawData, 
        id: doc.id,
        prompts: processedPrompts
      };
      
      const eventData = {
        ...convertTimestamps(eventDataWithId),
        prompts: processedPrompts
      } as Event;
      
      return eventData;
    }
    return null;
  } catch (error) {
    console.error('❌ Error in getEventByUrl:', error);
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
      // Fallback logic here...
      const fallbackQuery = query(eventsCollection, where('organizerId', '==', organizerId));
      const querySnapshot = await getDocs(fallbackQuery);
      const events = querySnapshot.docs.map(doc => 
        convertTimestamps({ ...doc.data(), id: doc.id } as Event)
      );
      events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return events;
    }
    
    console.error('❌ Error in getUserEvents:', error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<void> => {
  const eventDoc = doc(eventsCollection, eventId);
  await updateDoc(eventDoc, { ...updates, updatedAt: new Date() });
};

// Event Participant operations
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
  
  // Update event stats - increment participant count
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
      // Fallback logic...
      const fallbackQuery = query(participantsCollection, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(fallbackQuery);
      const participants = querySnapshot.docs.map(doc =>
        convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
      );
      participants.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
      return participants;
    }
    
    console.error('❌ Error in getEventParticipants:', error);
    return [];
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

// ✅ SIMPLIFIED: Post operations

// ✅ Get all posts for admin/organizer (including unapproved ones)
export const getAllEventPosts = async (eventId: string): Promise<Post[]> => {
  try {
    const q = query(
      postsCollection,
      where('eventId', '==', eventId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // ✅ Ensure likes array is properly handled
      return convertTimestamps({
        ...data,
        id: doc.id,
        likes: Array.isArray(data.likes) ? data.likes : [], // ✅ Ensure likes is array
        likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
      } as Post);
    });
    
    console.log(`📋 Loaded ${posts.length} total posts (admin view) for event: ${eventId}`);
    return posts;
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 FIREBASE INDEX REQUIRED for getAllEventPosts!');
      // Fallback logic...
      const fallbackQuery = query(postsCollection, where('eventId', '==', eventId));
      const querySnapshot = await getDocs(fallbackQuery);
      const posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestamps({
          ...data,
          id: doc.id,
          likes: Array.isArray(data.likes) ? data.likes : [],
          likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
        } as Post);
      });
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return posts;
    }
    
    console.error('❌ Error in getAllEventPosts:', error);
    return [];
  }
};

// ✅ Get approved posts for regular users
export const getEventPosts = async (eventId: string): Promise<Post[]> => {
  try {
    const q = query(
      postsCollection,
      where('eventId', '==', eventId),
      where('isApproved', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // ✅ Ensure likes array is properly handled
      return convertTimestamps({
        ...data,
        id: doc.id,
        likes: Array.isArray(data.likes) ? data.likes : [], // ✅ Ensure likes is array
        likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
      } as Post);
    });
    
    console.log(`📋 Loaded ${posts.length} approved posts for event: ${eventId}`);
    return posts;
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 FIREBASE INDEX REQUIRED for getEventPosts!');
      // Fallback logic...
      const fallbackQuery = query(
        postsCollection,
        where('eventId', '==', eventId),
        where('isApproved', '==', true)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestamps({
          ...data,
          id: doc.id,
          likes: Array.isArray(data.likes) ? data.likes : [],
          likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
        } as Post);
      });
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return posts;
    }
    
    console.error('❌ Error in getEventPosts:', error);
    return [];
  }
};

export const getPost = async (postId: string): Promise<Post | null> => {
  const postDoc = doc(postsCollection, postId);
  const postSnap = await getDoc(postDoc);
  if (postSnap.exists()) {
    const data = postSnap.data();
    return convertTimestamps({
      ...data,
      id: postSnap.id,
      likes: Array.isArray(data.likes) ? data.likes : [],
      likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
    } as Post);
  }
  return null;
};

export const updatePost = async (postId: string, updates: Partial<Post>): Promise<void> => {
  const postDoc = doc(postsCollection, postId);
  await updateDoc(postDoc, { ...updates, updatedAt: new Date() });
};

// ✅ Comment operations
export const createComment = async (commentData: CreateCommentData): Promise<string> => {
  const docData = {
    ...commentData,
    createdAt: new Date(),
  };
  const commentDoc = await addDoc(commentsCollection, docData as any);
  
  // Update the post's comment count
  try {
    const postDoc = doc(postsCollection, commentData.postId);
    await updateDoc(postDoc, {
      commentsCount: increment(1)
    });
    console.log('✅ Updated post comment count');
  } catch (error) {
    console.error('❌ Error updating post comment count:', error);
  }
  
  // Update event stats - increment comment count
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
      const fallbackQuery = query(
        commentsCollection,
        where('postId', '==', postId),
        where('isApproved', '==', true)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const comments = querySnapshot.docs.map(doc =>
        convertTimestamps({ ...doc.data(), id: doc.id } as Comment)
      );
      comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return comments;
    }
    
    console.error('❌ Error in getPostComments:', error);
    return [];
  }
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
      const fallbackQuery = query(participantsCollection, where('userId', '==', userId));
      const querySnapshot = await getDocs(fallbackQuery);
      const participations = querySnapshot.docs.map(doc =>
        convertTimestamps({ ...doc.data(), id: doc.id } as EventParticipant)
      );
      participations.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
      return participations;
    }
    
    console.error('❌ Error in getUserEventParticipations:', error);
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
    const posts = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return convertTimestamps({
        ...data,
        id: doc.id,
        likes: Array.isArray(data.likes) ? data.likes : [],
        likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
      } as Post);
    });
    return posts;
  } catch (error) {
    if (isIndexError(error)) {
      console.error('🔥 INDEX ERROR in getUserPostsInEvent - using fallback');
      const fallbackQuery = query(
        postsCollection,
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(fallbackQuery);
      const posts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return convertTimestamps({
          ...data,
          id: doc.id,
          likes: Array.isArray(data.likes) ? data.likes : [],
          likesCount: Array.isArray(data.likes) ? data.likes.length : (data.likesCount || 0)
        } as Post);
      });
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return posts;
    }
    
    console.error('❌ Error in getUserPostsInEvent:', error);
    return [];
  }
};