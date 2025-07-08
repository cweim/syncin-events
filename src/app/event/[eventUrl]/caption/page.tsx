// src/app/event/[eventUrl]/caption/page.tsx
// Version: 1.0 - SyncIn caption page with consistent branding

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  ArrowLeft, 
  Send,
  X
} from 'lucide-react';
import { 
  getEventByUrl, 
  getParticipantByUser, 
  createPost,
  updateParticipant
} from '@/lib/database';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Event, EventParticipant, CreatePostData } from '@/types';
import { getThemeStyles, getThemeInlineStyles, getCardStyles } from '@/lib/theme-utils';

interface PageProps {
  params: Promise<{ eventUrl: string }>;
}

function EventCaptionPageContent({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get image from URL params
  const imageUri = searchParams.get('imageUri');
  
  // Caption states
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isFirstPostInEvent, setIsFirstPostInEvent] = useState(false);

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
        setIsFirstPostInEvent(!participantData.hasPosted);

        console.log('👤 Participant data:', participantData);
        console.log('📸 Has posted:', participantData.hasPosted);
        console.log('🆕 Is first post:', !participantData.hasPosted);

      } catch (error) {
        console.error('💥 Error loading event data:', error);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [eventUrl, currentUser, router]);

  const uploadPhoto = async (dataUrl: string): Promise<string> => {
    if (!event || !currentUser) throw new Error('Missing required data');

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const imageRef = ref(storage, `events/${event.id}/posts/${currentUser.uid}/${Date.now()}.jpg`);
    const snapshot = await uploadBytes(imageRef, blob);
    return await getDownloadURL(snapshot.ref);
  };

  const handleSubmit = async () => {
    console.log('=== STARTING POST SUBMISSION ===');

    // Clear any previous error
    setError('');

    // Validation
    if (!imageUri) {
      setError('No image found. Please retake your photo.');
      alert('No image found. Please retake your photo.');
      return;
    }

    if (caption.trim().length === 0) {
      setError('Please write a caption for your moment.');
      alert('Please write a caption for your moment.');
      return;
    }

    if (!event || !participant || !currentUser) {
      setError('Missing event data. Please try again.');
      alert('Missing event data. Please try again.');
      return;
    }

    console.log('✅ Initial validation passed');

    setIsUploading(true);
    try {
      console.log('🔄 Starting photo upload process...');
      console.log('👤 User:', participant.displayName, 'ID:', currentUser.uid);
      console.log('📝 Caption length:', caption.trim().length);
      console.log('🖼️ Image URI:', imageUri.substring(0, 50) + '...');
      console.log('🎯 Target event:', event.id, '-', event.title);

      // Upload the photo
      console.log('📤 Uploading photo...');
      const imageUrl = await uploadPhoto(imageUri);
      console.log('✅ Photo uploaded successfully:', imageUrl);

      // Parse tags and clean them
      const tagsArray = tags
        .split(/[\s,]+/) // Split by spaces or commas
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 1) // Remove empty or single character tags
        .slice(0, 10); // Limit to 10 tags

      console.log('🏷️ Processed tags:', tagsArray);

      // Create the post
      const postData: CreatePostData = {
        eventId: event.id,
        participantId: participant.id,
        userId: currentUser.uid,
        imageUrl,
        caption: caption.trim(),
        isReported: false,
        isApproved: false,
      };

      if (tagsArray.length > 0) {
        postData.tags = tagsArray;
      }

      console.log('📝 Creating post with data:', postData);
      const newPost = await createPost(postData);

      if (!newPost) {
        throw new Error('Failed to create post - no result returned');
      }

      console.log('✅ Post created successfully:', newPost);

      // Update participant status if this is their first post
      if (isFirstPostInEvent) {
        console.log('🔓 Updating participant status for first post...');
        
        await updateParticipant(participant.id, {
          hasPosted: true,
          postsCount: (participant.postsCount || 0) + 1,
          lastPostAt: new Date()
        });

        console.log('✅ Participant status updated');
      }

      // Show success overlay
      setIsUploading(false);
      setShowSuccessOverlay(true);

      // Auto-navigate after 3 seconds
      setTimeout(() => {
        router.replace(`/event/${eventUrl}/feed`);
      }, 3000);

    } catch (error) {
      console.error('❌ Error uploading photo:', error);

      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMsg);

      setError(errorMsg);
      alert(`Upload Failed: ${errorMsg}\n\nPlease check your connection and try again.`);
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const goToFeedNow = () => {
    router.replace(`/event/${eventUrl}/feed`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !participant || !imageUri) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Unable to Process Image</h1>
          <p className="mb-6 text-gray-600">
            {error || 'No image data found. Please retake your photo.'}
          </p>
          <Link
            href={`/event/${eventUrl}/camera`}
            className="inline-block text-white px-6 py-2 rounded-lg transition-colors hover:opacity-90"
            style={{backgroundColor: '#6C63FF'}}
          >
            Back to Camera
          </Link>
        </div>
      </div>
    );
  }

  const themeStyles = getThemeStyles(event.theme);
  const themeInlineStyles = getThemeInlineStyles(event.theme);

  return (
    <div className={`min-h-screen flex flex-col ${themeStyles.background}`} style={themeInlineStyles}>
      {/* Header */}
      <header className={`${themeStyles.cardBackground} shadow-sm`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              disabled={isUploading}
              className={`flex items-center ${themeStyles.textSecondary}`}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Cancel</span>
            </button>
            
            <div className="text-center">
              <h1 className={`text-lg font-bold ${themeStyles.textPrimary}`}>Add Caption</h1>
              <p className={`text-sm ${themeStyles.textSecondary}`}>{event.title}</p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isUploading || caption.trim().length === 0}
              className="text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 flex items-center"
              style={{backgroundColor: '#6C63FF'}}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sharing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* Error Display */}
          {error && (
            <div className={`p-3 rounded-lg ${event.theme === 'dark' ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm text-center ${themeStyles.error}`}>⚠️ {error}</p>
            </div>
          )}

          {/* Image Preview */}
          <div className="relative">
            <img 
              src={imageUri}
              alt="Captured photo"
              className="w-full aspect-square object-cover rounded-2xl shadow-sm"
              style={{backgroundColor: '#F3F4F6'}}
            />
            
            {isFirstPostInEvent && (
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold text-white" style={{backgroundColor: '#22C55E'}}>
                🎉 First Moment!
              </div>
            )}
          </div>

          {/* Caption Input */}
          <div className={`${themeStyles.cardBackground} rounded-2xl p-4 shadow-sm`}>
            <label className={`block text-sm font-medium mb-3 ${themeStyles.textPrimary}`}>
              Caption *
            </label>
            <textarea
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                if (error) setError(''); // Clear error when user types
              }}
              className={`w-full px-0 py-2 border-0 resize-none focus:ring-0 text-base ${themeStyles.textPrimary}`}
              style={{backgroundColor: 'transparent'}}
              placeholder="Share what's happening at this moment..."
              rows={4}
              maxLength={500}
              autoFocus
            />
            <div className={`text-xs text-right mt-2 ${themeStyles.textMuted}`}>
              {caption.length}/500 characters
            </div>
          </div>

          {/* Tags Input */}
          <div className={`${themeStyles.cardBackground} rounded-2xl p-4 shadow-sm`}>
            <label className={`block text-sm font-medium mb-3 ${themeStyles.textPrimary}`}>
              Tags (optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={`w-full px-0 py-2 border-0 focus:ring-0 text-base ${themeStyles.textPrimary}`}
              style={{backgroundColor: 'transparent'}}
              placeholder="#networking #fun #event"
            />
            <p className={`text-xs mt-2 ${themeStyles.textMuted}`}>
              Add hashtags separated by spaces (max 10)
            </p>
          </div>

          {/* First Upload Info */}
          {isFirstPostInEvent && (
            <div className="p-4 rounded-2xl shadow-sm" style={{backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'}}>
              <h3 className="text-sm font-bold mb-2" style={{color: '#166534'}}>
                🔓 This will unlock this event's feed!
              </h3>
              <p className="text-sm" style={{color: '#166534'}}>
                Once you share this moment, you'll be able to see and interact with all the photos from "{event.title}".
              </p>
            </div>
          )}

          {/* Approval Notice */}
          {event.moderationEnabled && event.requiresApproval && (
            <div className="p-4 rounded-2xl shadow-sm" style={{backgroundColor: '#FFF4E6', borderColor: '#FED7AA'}}>
              <p className="text-sm" style={{color: '#EA580C'}}>
                📋 This moment will be reviewed before appearing in the feed.
              </p>
            </div>
          )}

          {/* Extra padding at bottom */}
          <div className="h-20"></div>
        </div>
      </div>

      {/* Upload Progress Overlay */}
      {isUploading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
            <h3 className="text-lg font-bold mb-2" style={{color: '#111827'}}>
              {isFirstPostInEvent 
                ? "Sharing your first SyncIn moment..." 
                : "Sharing moment..."}
            </h3>
            <p className="text-sm" style={{color: '#6B7280'}}>
              This may take a moment depending on your connection
            </p>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold mb-4" style={{color: '#111827'}}>
              SyncIn Moment Shared!
            </h3>
            <p className="text-sm mb-6 leading-relaxed" style={{color: '#6B7280'}}>
              {isFirstPostInEvent
                ? `Your first moment has been shared with "${event.title}"!\nThis event's feed is now unlocked!`
                : `Your moment has been added to "${event.title}"!`}
            </p>
            <button
              onClick={goToFeedNow}
              className="w-full text-white py-3 rounded-lg font-bold text-lg transition-colors hover:opacity-90 mb-4"
              style={{backgroundColor: '#6C63FF'}}
            >
              View Feed
            </button>
            <p className="text-xs" style={{color: '#9CA3AF'}}>
              Auto-redirecting in 3 seconds...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EventCaptionPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EventCaptionPageContent params={params} />
    </Suspense>
  );
}