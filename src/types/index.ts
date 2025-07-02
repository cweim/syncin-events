// src/types/index.ts
// Version: 2.0 - Enhanced with attendee experience features

export interface SocialProfiles {
  instagram?: string;   // Instagram handle without @
  linkedin?: string;    // LinkedIn handle without @
  facebook?: string;    // Facebook handle without @
}

export interface User {
  id: string;                    // Firebase Auth UID
  email: string;
  displayName: string;
  profilePhotoUrl?: string;
  role: 'organizer' | 'attendee' | 'both';
  
  // Social profiles for attendee networking
  socialProfiles?: SocialProfiles;
  
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
  eventsOrganized: number;      // Count for analytics
  eventsAttended: number;       // Count for analytics
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
  
  // Statistics
  stats: EventStats;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'live' | 'ended' | 'archived';
}

export interface EventParticipant {
  id: string;                   // Auto-generated
  eventId: string;              // Reference to events
  userId: string;               // Reference to users (always required now - no more guests)
  
  // Event-specific Profile
  displayName: string;          // Can be different from user.displayName
  profilePhotoUrl?: string;     // Can override user's main profile photo for this event
  promptResponses: Record<string, string>; // promptId -> response
  
  // Participation Status
  joinedAt: Date;
  hasPosted: boolean;           // For gated feed access
  isApproved: boolean;          // If event requires approval
  isModerator: boolean;         // Can moderate content
  
  // Statistics
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
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
  
  // Engagement
  likesCount: number;
  commentsCount: number;
  
  // Technical
  imageMetadata?: ImageMetadata;
}

export interface Comment {
  id: string;
  postId: string;               // Reference to posts
  participantId: string;        // Reference to eventParticipants
  userId: string;               // Reference to users
  
  // Content
  text: string;
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  
  // Moderation
  isApproved: boolean;
  isReported: boolean;
}

export type ReactionType = 'like' | 'love' | 'fire' | 'clap';

export interface Reaction {
  id: string;
  postId: string;               // Reference to posts
  participantId: string;        // Reference to eventParticipants
  userId: string;               // Reference to users
  
  type: ReactionType;
  createdAt: Date;
}

// Utility types for creating new documents (without auto-generated fields)
export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>;
export type CreateEventData = Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'stats'>;
export type CreateParticipantData = Omit<EventParticipant, 'id' | 'joinedAt' | 'postsCount' | 'likesReceived' | 'commentsReceived'>;
export type CreatePostData = Omit<Post, 'id' | 'createdAt' | 'likesCount' | 'commentsCount'>;
export type CreateCommentData = Omit<Comment, 'id' | 'createdAt'>;
export type CreateReactionData = Omit<Reaction, 'id' | 'createdAt'>;

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