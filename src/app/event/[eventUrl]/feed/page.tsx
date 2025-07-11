// src/app/event/[eventUrl]/feed/page.tsx
// Version: 4.2 - FIXED: Simple array-based likes like React Native version

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  Heart,
  MessageCircle,
  Download,
  Sparkles,
  Send,
  User,
  Home
} from 'lucide-react';
import { 
  getEventByUrl, 
  getParticipantByUser, 
  getEventPosts,
  createComment,
  getPostComments,
  getUser
} from '@/lib/database';
import { downloadPhoto } from '@/lib/download-utils';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { Event, EventParticipant, Post, Comment } from '@/types';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getThemeStyles, getThemeInlineStyles, getCardStyles } from '@/lib/theme-utils';

interface PageProps {
  params: Promise<{ eventUrl: string }>;
}

interface EnhancedComment extends Comment {
  authorDisplayName?: string;
  authorProfilePicUrl?: string;
}

interface PostWithInteractions extends Post {
  userHasLiked: boolean;
  comments: EnhancedComment[];
  likes: string[]; // Array of user IDs who liked the post
  authorProfilePicUrl?: string; // Author's profile photo
  authorDisplayName?: string; // Author's display name
}

// Utility to safely convert Firestore Timestamp or Date-like to Date
function toDateSafe(val: any): Date {
  return val && typeof val.toDate === 'function' ? val.toDate() : new Date(val);
}

export default function EventFeedPage({ params }: PageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [eventPosts, setEventPosts] = useState<PostWithInteractions[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);
  
  // Comment states
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  // Real-time listener cleanup
  const [unsubscriber, setUnsubscriber] = useState<(() => void) | null>(null);

  useEffect(() => {
    const loadEventUrl = async () => {
      try {
        const resolvedParams = await params;
        setEventUrl(resolvedParams.eventUrl);
      } catch (error) {
        console.error('❌ Error resolving params:', error);
        setError('Invalid event URL');
      }
    };

    loadEventUrl();
  }, [params]);

  useEffect(() => {
    // Check authentication
    const user = getCurrentFirebaseUser();
    if (!user) {
      router.push(`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!eventUrl || !currentUser) return;

    const loadEventData = async () => {
      try {
        const eventData = await getEventByUrl(eventUrl);
        if (!eventData) {
          setError('Event not found');
          return;
        }

        if (!eventData.isActive) {
          setError('This event is no longer active');
          return;
        }

        setEvent(eventData);

        // Check if user is a participant
        const participantData = await getParticipantByUser(eventData.id, currentUser.uid);
        if (!participantData) {
          // User hasn't joined yet, redirect to prompts
          router.push(`/event/${eventUrl}/prompts`);
          return;
        }

        setParticipant(participantData);

        // ✅ Set up simple real-time listener like React Native version
        setupRealTimeListener(eventData.id, currentUser.uid);

        console.log('👤 Participant data:', participantData);
        console.log('📸 Has posted:', participantData.hasPosted);

      } catch (error) {
        console.error('💥 Error loading event data:', error);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();

    // Cleanup listener on unmount
    return () => {
      if (unsubscriber) {
        unsubscriber();
      }
    };
  }, [eventUrl, currentUser, router]);

  // ✅ SIMPLIFIED: Single real-time listener like React Native
  const setupRealTimeListener = async (eventId: string, userId: string) => {
    try {
      console.log('🔄 Setting up real-time listener for event:', eventId);

      // Real-time listener for posts (includes likes array)
      const postsQuery = query(
        collection(db, 'posts'),
        where('eventId', '==', eventId),
        where('isApproved', '==', true),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
        console.log('📱 Real-time posts update received');
        
        const updatedPosts: PostWithInteractions[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // ✅ Get likes array (like React Native)
          const likesArray = Array.isArray(data.likes) ? data.likes : [];
          const userHasLiked = likesArray.includes(userId);
          
          // Get comments for this post with user data
          let comments: Comment[] = [];
          try {
            comments = await getPostComments(docSnap.id);
            // Enhance comments with user data
            const enhancedComments = await Promise.all(
              comments.map(async (comment) => {
                let commentAuthorName = 'Event Attendee';
                let commentAuthorProfilePic = '';
                
                try {
                  const commentParticipant = await getParticipantByUser(eventId, comment.userId);
                  if (commentParticipant) {
                    commentAuthorName = commentParticipant.displayName || 'Event Attendee';
                    const commentUser = await getUser(comment.userId);
                    if (commentUser) {
                      commentAuthorProfilePic = commentUser.profilePhotoUrl || '';
                    }
                  }
                } catch (error) {
                  console.log('👤 Could not load comment author data:', comment.id);
                }

                return {
                  ...comment,
                  createdAt: toDateSafe(comment.createdAt),
                  authorDisplayName: commentAuthorName,
                  authorProfilePicUrl: commentAuthorProfilePic
                };
              })
            );
            comments = enhancedComments;
          } catch (commentError) {
            console.log('📝 Could not load comments for post:', docSnap.id);
            comments = [];
          }

          // ✅ Get author user data and participant data for profile info
          let authorDisplayName = 'Event Attendee';
          let authorProfilePicUrl = '';
          
          try {
            // Get participant data for this post's author
            const authorParticipant = await getParticipantByUser(eventId, data.userId);
            if (authorParticipant) {
              authorDisplayName = authorParticipant.displayName || 'Event Attendee';
              // Get user data for profile photo
              const authorUser = await getUser(data.userId);
              if (authorUser) {
                authorProfilePicUrl = authorUser.profilePhotoUrl || '';
              }
            }
          } catch (error) {
            console.log('👤 Could not load author data for post:', docSnap.id);
          }

          // ✅ Convert post data with proper timestamp handling
          const postData: PostWithInteractions = {
            id: docSnap.id,
            eventId: data.eventId || '',
            participantId: data.participantId || '',
            userId: data.userId || '',
            imageUrl: data.imageUrl || '',
            videoUrl: data.videoUrl || '',
            mediaType: data.mediaType || 'image',
            caption: data.caption || '',
            tags: Array.isArray(data.tags) ? data.tags : [],
            createdAt: toDateSafe(data.createdAt),
            updatedAt: data.updatedAt ? toDateSafe(data.updatedAt) : undefined,
            isApproved: data.isApproved || false,
            isReported: data.isReported || false,
            moderationNotes: data.moderationNotes,
            approvedAt: data.approvedAt ? toDateSafe(data.approvedAt) : undefined,
            likesCount: likesArray.length, // ✅ Calculate from array length
            commentsCount: comments.length, // ✅ Calculate from comments
            imageMetadata: data.imageMetadata,
            
            // ✅ Add interaction data
            userHasLiked,
            comments,
            likes: likesArray,
            authorProfilePicUrl,
            // Add author display name for easier access
            authorDisplayName
          };

          updatedPosts.push(postData);
        }
        
        setEventPosts(updatedPosts);
        console.log(`📋 Updated ${updatedPosts.length} posts with interactions`);
      });

      setUnsubscriber(() => unsubscribe);

    } catch (error) {
      console.error('Error setting up real-time listener:', error);
    }
  };

  const handleDownloadPhoto = async (imageUrl: string, filename: string = 'photo.jpg') => {
    try {
      await downloadPhoto(imageUrl, filename);
    } catch (error) {
      console.error('Error downloading photo:', error);
      alert('Failed to download photo. Please try again.');
    }
  };

  const formatPostTime = (createdAt: Date | any) => {
    try {
      const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return diffInMinutes < 1 ? "Just now" : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }
    } catch (error) {
      console.error('Error formatting post time:', error);
      return "Recently";
    }
  };

  const formatPostDateTime = (createdAt: Date | any) => {
    try {
      // Handle different date formats more reliably
      let date: Date;
      
      if (createdAt && typeof createdAt.toDate === 'function') {
        // Firestore Timestamp
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        // Already a Date object
        date = createdAt;
      } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
        // String or number timestamp
        date = new Date(createdAt);
      } else {
        console.warn('Unknown date format:', createdAt);
        date = new Date(); // fallback to current time
      }

      // Validate the date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', createdAt);
        date = new Date(); // fallback to current time
      }

      return {
        time: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        date: date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      };
    } catch (error) {
      console.error('Error formatting post date time:', error, createdAt);
      return {
        time: "Unknown",
        date: "Unknown"
      };
    }
  };

  // ✅ FIXED: Simple like/unlike logic like React Native
  const handleLike = async (postId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser) return;

    console.log('👆 Like action:', { postId, isCurrentlyLiked, userId: currentUser.uid });

    try {
      // ✅ Optimistically update UI (like React Native)
      setEventPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes: isCurrentlyLiked
                  ? post.likes.filter(uid => uid !== currentUser.uid)
                  : [...post.likes, currentUser.uid],
                userHasLiked: !isCurrentlyLiked,
                likesCount: isCurrentlyLiked 
                  ? Math.max(0, post.likesCount - 1) 
                  : post.likesCount + 1
              }
            : post
        )
      );

      // ✅ Update Firestore (like React Native)
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: isCurrentlyLiked 
          ? arrayRemove(currentUser.uid) 
          : arrayUnion(currentUser.uid),
      });

      console.log('✅ Successfully updated like in Firestore');

    } catch (error) {
      console.error('❌ Error updating like:', error);
      
      // ✅ Revert optimistic update on error
      setEventPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,
                likes: isCurrentlyLiked
                  ? [...post.likes, currentUser.uid]
                  : post.likes.filter(uid => uid !== currentUser.uid),
                userHasLiked: isCurrentlyLiked,
                likesCount: isCurrentlyLiked 
                  ? post.likesCount + 1 
                  : Math.max(0, post.likesCount - 1)
              }
            : post
        )
      );
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!participant || !newCommentText.trim()) return;

    setPostingComment(true);
    try {
      await createComment({
        postId,
        participantId: participant.id,
        userId: currentUser.uid,
        content: newCommentText.trim(),
        eventId: event?.id || '',
        isApproved: true,
        isReported: false
      });

      // Optimistically update local state
      setEventPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? { ...post, commentsCount: post.commentsCount + 1 }
            : post
        )
      );

      setNewCommentText('');

    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    } finally {
      setPostingComment(false);
    }
  };

  const handleProfilePress = (userId: string) => {
    router.push(`/user-profile?userId=${userId}&eventId=${event?.id}&eventUrl=${eventUrl}`);
  };

  // ✅ Helper function to get user initials (like React Native)
  const getUserInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || '?';
  };

  if (loading) {
    // Use default light theme for loading since event theme isn't loaded yet
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p className="text-gray-600">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !participant) {
    // Use default light theme for error since event theme might not be loaded
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Unable to Access Event</h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <Link
            href={`/event/${eventUrl}`}
            className="inline-block text-white px-6 py-2 rounded-lg transition-colors hover:opacity-90"
            style={{backgroundColor: '#6C63FF'}}
          >
            Back to Event
          </Link>
        </div>
      </div>
    );
  }

  // Get theme styles
  const theme = event?.theme || 'light';
  const themeStyles = getThemeStyles(theme);
  const themeInlineStyles = getThemeInlineStyles(theme);

  const renderPost = (post: PostWithInteractions, index: number) => {
    const { time, date } = formatPostDateTime(post.createdAt);
    const isCommentOpen = activeCommentPostId === post.id;

    return (
      <div key={post.id || index} className={`${themeStyles.cardBackground} rounded-2xl shadow-sm overflow-hidden mb-5`}>
        {/* Post Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <button
            onClick={() => handleProfilePress(post.userId)}
            className="flex items-center flex-1"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center mr-3" style={{backgroundColor: '#EDE9FE'}}>
              {/* ✅ Profile photo with fallback to initials */}
              {post.authorProfilePicUrl && post.authorProfilePicUrl.trim() !== '' ? (
                <img 
                  src={post.authorProfilePicUrl}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold" style={{color: '#6C63FF'}}>
                  {getUserInitials(post.authorDisplayName || 'Event Attendee')}
                </span>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className={`text-base font-semibold ${themeStyles.textPrimary}`}>
                {post.authorDisplayName || 'Event Attendee'}
              </p>
              <p className={`text-xs ${themeStyles.textSecondary}`}>SyncIn • {event.location}</p>
            </div>
          </button>
          <div className="text-right">
            <p className={`text-sm font-semibold ${themeStyles.textPrimary}`}>{time}</p>
            <p className={`text-xs ${themeStyles.textSecondary}`}>{date}</p>
          </div>
        </div>

        {/* Post Media */}
        <div className="relative">
          {post.mediaType === 'video' && post.videoUrl && post.videoUrl.trim() !== '' ? (
            <video 
              src={post.videoUrl} 
              className="w-full aspect-video object-cover"
              style={{backgroundColor: '#F3F4F6'}}
              controls
              preload="metadata"
              muted
            />
          ) : (
            post.imageUrl && post.imageUrl.trim() !== '' ? (
              <img 
                src={post.imageUrl} 
                alt={post.caption || 'Event photo'}
                className="w-full aspect-square object-cover"
                style={{backgroundColor: '#F3F4F6'}}
              />
            ) : (
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm">No image available</p>
                </div>
              </div>
            )
          )}
          
          {/* Download button overlay */}
          <button
            onClick={() => {
              if (post.mediaType === 'video' && post.videoUrl) {
                handleDownloadPhoto(post.videoUrl, `${event?.title || 'event'}-video-${post.id}.mp4`);
              } else if (post.imageUrl) {
                handleDownloadPhoto(post.imageUrl, `${event?.title || 'event'}-photo-${post.id}.jpg`);
              }
            }}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <Download className="h-4 w-4 text-white" />
          </button>
        </div>
        
        {/* Post Caption */}
        {post.caption && (
          <div className="px-4 pt-3">
            <p className={`text-base leading-relaxed ${themeStyles.textPrimary}`}>{post.caption}</p>
          </div>
        )}
        
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="px-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs px-3 py-1 rounded-full"
                  style={{backgroundColor: '#EDE9FE', color: '#6C63FF'}}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* ✅ Post Actions with simplified like logic */}
        <div className="flex items-center px-4 py-3 gap-4">
          <button
            onClick={() => handleLike(post.id, post.userHasLiked)}
            className={`flex items-center gap-1 px-3 py-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
          >
            <Heart 
              className={`h-5 w-5 ${post.userHasLiked ? 'fill-red-500 text-red-500' : ''}`} 
              style={post.userHasLiked ? {color: '#EF4444'} : undefined}
            />
            <span 
              className={`text-sm font-medium ${post.userHasLiked ? 'text-red-500' : themeStyles.textSecondary}`}
            >
              {post.likesCount}
            </span>
          </button>
          
          <button
            onClick={() => setActiveCommentPostId(isCommentOpen ? null : post.id)}
            className={`flex items-center gap-1 px-3 py-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
          >
            <MessageCircle className={`h-5 w-5 ${themeStyles.textSecondary}`} />
            <span className={`text-sm font-medium ${themeStyles.textSecondary}`}>{post.commentsCount}</span>
          </button>
        </div>

        {/* Comment Section */}
        {isCommentOpen && (
          <div className={`border-t ${themeStyles.border}`}>
            {/* Existing Comments */}
            {post.comments.length > 0 && (
              <div className="px-4 py-3 max-h-40 overflow-y-auto">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="mb-3 last:mb-0">
                    <div className="flex items-start space-x-2">
                      <button
                        onClick={() => handleProfilePress(comment.userId)}
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{backgroundColor: '#EDE9FE'}}
                      >
                        {comment.authorProfilePicUrl && comment.authorProfilePicUrl.trim() !== '' ? (
                          <img 
                            src={comment.authorProfilePicUrl}
                            alt="Profile"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold" style={{color: '#6C63FF'}}>
                            {getUserInitials(comment.authorDisplayName || 'Event Attendee')}
                          </span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <button
                            onClick={() => handleProfilePress(comment.userId)}
                            className={`font-medium hover:underline ${themeStyles.textPrimary}`}
                          >
                            {comment.authorDisplayName || 'Event Attendee'}
                          </button>
                          <span className={`ml-2 ${themeStyles.textSecondary}`}>{comment.content}</span>
                        </p>
                        <p className={`text-xs mt-1 ${themeStyles.textMuted}`}>
                          {comment.createdAt ? formatPostTime(comment.createdAt) : 'Recently'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Input */}
            <div className={`flex items-center p-4 gap-3 border-t ${themeStyles.border}`}>
              <input
                type="text"
                className={`flex-1 px-3 py-2 ${themeStyles.inputBorder} rounded-full text-sm focus:ring-2 focus:border-transparent ${themeStyles.inputBackground} ${themeStyles.textPrimary}`}
                style={{'--tw-ring-color': '#6C63FF'} as React.CSSProperties}
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !postingComment) {
                    handleAddComment(post.id);
                  }
                }}
              />
              <button
                onClick={() => handleAddComment(post.id)}
                disabled={postingComment || !newCommentText.trim()}
                className="text-white px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{backgroundColor: '#6C63FF'}}
              >
                {postingComment ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${themeStyles.background}`} style={themeInlineStyles}>
      {/* Header */}
      <header className={`${themeStyles.cardBackground} shadow-sm sticky top-0 z-10`}>
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/my-events"
              className={`flex items-center ${themeStyles.textSecondary}`}
            >
              <Home className="h-5 w-5 mr-1" />
              <span className="text-sm">Home</span>
            </Link>
            
            <div className="flex items-center">
              <Camera className="h-6 w-6 mr-2" style={{color: '#6C63FF'}} />
              <h1 className={`text-xl font-bold ${themeStyles.textPrimary}`}>{event.title}</h1>
            </div>
            
            <Link
              href={`/event/${eventUrl}/camera`}
              className="flex items-center text-white px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
              style={{backgroundColor: '#6C63FF'}}
            >
              <Camera className="h-4 w-4 mr-1" />
              Camera
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4">
        {/* First Time User Onboarding */}
        {!participant.hasPosted && showOnboarding && (
          <div className="bg-gradient-to-br from-indigo-400 via-purple-500 to-indigo-600 my-4 rounded-2xl p-8 text-center text-white shadow-xl">
            <div className="space-y-4">
              <Sparkles className="h-20 w-20 mx-auto" />
              <h2 className="text-2xl font-bold">Welcome to {event.title}! 🎉</h2>
              <p className="text-lg opacity-90">Hi {participant.displayName}!</p>
              <p className="text-base opacity-90">
                You can see there are already {eventPosts.length} amazing moments shared in this event!
              </p>
              <p className="text-sm opacity-80">
                Share your first SyncIn moment to unlock the full feed and start connecting with other attendees.
              </p>
              
              <div className="pt-4">
                <Link
                  href={`/event/${eventUrl}/camera`}
                  className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold text-lg inline-flex items-center hover:bg-gray-50 transition-all active:scale-95 shadow-lg"
                >
                  <Camera className="h-6 w-6 mr-2" />
                  📷 Share Your First Moment
                </Link>
              </div>
              
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-white/80 hover:text-white transition-colors text-sm mt-4 block mx-auto"
              >
                This is a preview of what you'll unlock ✨
              </button>
            </div>
          </div>
        )}

        {/* Feed Content */}
        <div className="py-4" style={{opacity: !participant.hasPosted ? 0.3 : 1}}>
          {eventPosts.length > 0 ? (
            <div>
              {/* Show all posts if user has posted, limited preview if not */}
              {(participant.hasPosted ? eventPosts : eventPosts.slice(0, 2)).map((post, index) => 
                renderPost(post, index)
              )}

              {/* Show more prompt for non-posters */}
              {!participant.hasPosted && eventPosts.length > 2 && (
                <div className={`${themeStyles.cardBackground} rounded-2xl p-8 text-center shadow-sm`}>
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
                        <Camera className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{backgroundColor: '#FF9F1C'}}>
                        {eventPosts.length - 2}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className={`text-lg font-bold mb-2 ${themeStyles.textPrimary}`}>
                        {eventPosts.length - 2} more moments waiting!
                      </h3>
                      <p className={`text-sm ${themeStyles.textSecondary}`}>
                        Share your moment to see all {eventPosts.length} photos from this event.
                      </p>
                    </div>
                    
                    <Link
                      href={`/event/${eventUrl}/camera`}
                      className="text-white px-6 py-3 rounded-2xl font-bold inline-flex items-center transition-colors hover:opacity-90 active:scale-95"
                      style={{backgroundColor: '#6C63FF'}}
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Share to unlock
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center" style={{backgroundColor: '#EDE9FE'}}>
                  <Camera className="h-12 w-12" style={{color: '#6C63FF'}} />
                </div>
                
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${themeStyles.textPrimary}`}>
                    No moments yet!
                  </h3>
                  <p className={themeStyles.textSecondary}>
                    Be the first to share a moment from {event.title}
                  </p>
                </div>
                
                <Link
                  href={`/event/${eventUrl}/camera`}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold inline-flex items-center hover:from-indigo-600 hover:to-purple-700 transition-all active:scale-95 shadow-lg"
                >
                  <Camera className="h-6 w-6 mr-2" />
                  Share First Moment
                </Link>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}