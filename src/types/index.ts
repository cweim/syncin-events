// src/types/index.ts
// Version: 3.1 - Added array-based likes support (like React Native)

export interface SocialProfiles {
  instagram?: string;   // Instagram handle without @
  linkedin?: string;    // LinkedIn handle without @
  facebook?: string;    // Facebook handle without @
  phone?: string;       // Phone number for networking
}

export interface User {
  id: string;                    // Firebase Auth UID
  email: string;
  displayName?: string;          // Made optional to match actual usage
  name?: string;                 // Alternative name field
  profilePhotoUrl?: string;
  role: 'organizer' | 'attendee' | 'both';
  
  // Social profiles for attendee networking
  socialProfiles?: SocialProfiles;
  instagram?: string;            // Direct fields for backward compatibility
  linkedin?: string;
  phone?: string;
  
  // Subscription (for organizers)
  subscription?: {
    plan: 'free' | 'pro';
    status: 'active' | 'canceled' | 'past_due';
    stripeCustomerId?: string;
    currentPeriodEnd?: Date;
  };
  
  // Event participation tracking
  eventsAttendedIds?: string[];   // Array of event IDs user has participated in
  
  // Metadata
  createdAt: Date;
  lastLoginAt: Date;
  eventsOrganized?: number;      // Count for analytics
  eventsAttended?: number;       // Count for analytics
}

export interface EventPrompt {
  id: string;
  question: string;
  type: 'text' | 'multipleChoice';
  options?: string[];           // For multiple choice
  required: boolean;
}

export interface EventBranding {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface EventStats {
  totalParticipants: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
}

export interface Event {
  id: string;                   // Auto-generated unique ID
  organizerId: string;          // Reference to users collection
  
  // Event Details
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  coverImageUrl?: string;
  
  // Branding (Pro feature)
  branding?: EventBranding;
  
  // Interaction Prompts
  prompts: EventPrompt[];
  
  // Access & Settings
  eventUrl: string;             // Unique URL for QR code
  isActive: boolean;            // Can attendees still join?
  requiresApproval: boolean;    // Organizer approval needed
  
  // Privacy Settings
  visibility: 'public' | 'private';
  allowGuestPosting: boolean;   // Can non-logged users post? (DEPRECATED - now all users must have accounts)
  moderationEnabled: boolean;
  
  // Theme Settings
  theme: 'light' | 'dark';
  
  // Statistics
  stats: EventStats;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'live' | 'ended' | 'archived';
}

export interface PromptResponse {
  question: string;
  answer: string;
}

export interface EventParticipant {
  id: string;                   // Auto-generated
  eventId: string;              // Reference to events
  userId: string;               // Reference to users (always required now - no more guests)
  
  // Event-specific Profile
  displayName: string;          // Can be different from user.displayName
  profilePhotoUrl?: string;     // Can override user's main profile photo for this event
  promptResponses?: PromptResponse[]; // Array of prompt responses
  
  // Participation Status
  joinedAt: Date;
  hasPosted: boolean;           // For gated feed access
  isApproved: boolean;          // If event requires approval
  isModerator: boolean;         // Can moderate content
  
  // Statistics
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  lastPostAt?: Date;            // Last time the participant posted (optional)
  approvedPostsCount?: number;  // Number of approved posts (optional)
}

export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  mimeType: string;
}

export interface Post {
  id: string;
  eventId: string;              // Reference to events
  participantId: string;        // Reference to eventParticipants
  userId: string;               // Reference to users (always required now)
  
  // Content
  imageUrl: string;             // Firebase Storage URL
  caption?: string;
  tags?: string[];              // e.g., ["#teamAlpha", "#panel2"]
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  
  // Moderation
  isApproved: boolean;
  isReported: boolean;
  moderationNotes?: string;
  approvedAt?: Date;            // When post was approved
  
  // ✅ NEW: Array-based likes (like React Native)
  likes: string[];              // Array of user IDs who liked the post
  
  // Engagement (calculated from arrays)
  likesCount: number;
  commentsCount: number;
  
  // Technical
  imageMetadata?: ImageMetadata;
  
  // ✅ NEW: Author profile photo support
  authorProfilePicUrl?: string;
}

export interface Comment {
  id: string;
  postId: string;               // Reference to posts
  participantId: string;        // Reference to eventParticipants
  userId: string;               // Reference to users
  eventId: string;              // Reference to events (for stats updates)
  
  // Content - FIXED: Changed from 'text' to 'content' to match database functions
  content: string;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  
  // Moderation
  isApproved: boolean;
  isReported: boolean;
}

// ✅ SIMPLIFIED: Keeping reaction types for backward compatibility
export type ReactionType = 'like' | 'dislike' | 'love' | 'fire' | 'clap';

export interface Reaction {
  id: string;
  postId: string;               // Reference to posts
  participantId: string;        // Reference to eventParticipants
  userId: string;               // Reference to users
  eventId: string;              // Reference to events (for stats updates)
  
  type: ReactionType;
  createdAt: Date;
}

// ✅ UPDATED: Create types for new array-based approach
export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>;
export type CreateEventData = Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'stats'>;
export type CreateParticipantData = Omit<EventParticipant, 'id' | 'joinedAt' | 'postsCount' | 'likesReceived' | 'commentsReceived'>;

// ✅ NEW: Updated post creation to include likes array
export type CreatePostData = Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount' | 'likes'> & {
  likes?: string[]; // Optional likes array for new posts (defaults to empty)
};

export type CreateCommentData = {
  postId: string;
  participantId: string;
  userId: string;
  eventId: string;
  content: string;              // FIXED: Changed from 'text' to 'content'
  isApproved: boolean;
  isReported: boolean;
};

export type CreateReactionData = {
  postId: string;
  participantId: string;
  userId: string;               // REQUIRED: For tracking who liked
  eventId: string;              // REQUIRED: For stats updates
  type: ReactionType;
};

// New types for attendee experience
export interface UserEventHistory {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  participantId: string;
  postsCount: number;
  joinedAt: Date;
}

export interface ProfileUpdateData {
  displayName?: string;
  profilePhotoUrl?: string;
  socialProfiles?: SocialProfiles;
}

// ✅ UPDATED: Types for real-time interactions in feed
export interface PostWithInteractions extends Post {
  userHasLiked: boolean;
  comments: Comment[];
  likes: string[];              // Array of user IDs
  authorProfilePicUrl?: string; // Author's profile photo
}

// ADDED: Types for search and navigation
export interface NavigationParams {
  eventUrl?: string;
  eventId?: string;
  userId?: string;
  postId?: string;
}

// ADDED: Types for form data
export interface EventCreationForm {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  prompts: EventPrompt[];
  moderationEnabled: boolean;
  requiresApproval: boolean;
}

export interface ParticipantRegistrationForm {
  displayName: string;
  promptResponses: Record<string, string>;
}