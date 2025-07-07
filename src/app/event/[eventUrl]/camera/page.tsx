// src/app/event/[eventUrl]/camera/page.tsx
// Version: 3.0 - Single capture camera with flash and SyncIn branding

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  RotateCcw, 
  Zap, 
  ZapOff, 
  Upload, 
  ArrowLeft, 
  X,
  Image as ImageIcon
} from 'lucide-react';
import { 
  getEventByUrl, 
  getParticipantByUser, 
  createPost
} from '@/lib/database';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Event, EventParticipant, CreatePostData } from '@/types';

interface PageProps {
  params: Promise<{ eventUrl: string }>;
}

export default function EventCameraPage({ params }: PageProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Photo states
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');
  const [isFirstPostInEvent, setIsFirstPostInEvent] = useState(false);

  // Caption states (for inline caption like BeReal)
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postTags, setPostTags] = useState('');
  const [isPosting, setIsPosting] = useState(false);

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


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedPhoto(e.target?.result as string);
        setShowCaptionModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handlePostSubmit = async () => {
    if (!capturedPhoto || !event || !participant || !currentUser) return;
  
    if (!postCaption.trim()) {
      alert('Please add a caption for your photo.');
      return;
    }

    setIsPosting(true);
    setError('');

    try {
      console.log('📝 Starting post submission...');

      // Upload photo
      const imageUrl = await uploadPhoto(capturedPhoto);
      console.log('📸 Photo uploaded:', imageUrl);

      // Parse tags and clean them
      const tagsArray = postTags
        .split(/[\s,]+/)
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 1)
        .slice(0, 10);

      console.log('🏷️ Processed tags:', tagsArray);

      // Create proper post data structure
      const postData: CreatePostData = {
        eventId: event.id,
        participantId: participant.id,
        userId: currentUser.uid,
        imageUrl,
        isReported: false,
        isApproved: false,
      };

      // Only add optional fields if they have values
      if (postCaption.trim()) {
        postData.caption = postCaption.trim();
      }

      if (tagsArray.length > 0) {
        postData.tags = tagsArray;
      }

      console.log('📝 Creating post with data:', postData);

      const postId = await createPost(postData);
      console.log('✅ Post created with ID:', postId);

      // Update local participant state immediately
      const updatedParticipant = {
        ...participant,
        hasPosted: true,
        postsCount: (participant.postsCount || 0) + 1,
        lastPostAt: new Date()
      };
      setParticipant(updatedParticipant);

      // Reset modal
      setShowCaptionModal(false);
      setCapturedPhoto('');
      setPostCaption('');
      setPostTags('');

      console.log('🎉 Post submission completed successfully!');

      // Show success message
      const approvalMessage = (!event.moderationEnabled || !event.requiresApproval) 
        ? 'SyncIn moment shared successfully! 🎉' 
        : 'Moment submitted for review! 📋 It will appear once approved.';
      
      alert(approvalMessage);

      // Redirect to feed
      router.push(`/event/${eventUrl}/feed`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share moment';
      setError(errorMessage);
      console.error('💥 Error posting photo:', error);
      
      alert(`Failed to share moment: ${errorMessage}`);
    } finally {
      setIsPosting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading camera...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !participant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4" style={{color: '#111827'}}>Unable to Access Camera</h1>
          <p className="mb-6" style={{color: '#6B7280'}}>{error}</p>
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

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#000000'}}>
      {/* Header */}
      <header className="bg-white shadow-sm relative z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/event/${eventUrl}/feed`} className="flex items-center" style={{color: '#6B7280'}}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to Feed</span>
            </Link>
            
            <div className="flex items-center">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-lg font-bold" style={{color: '#111827'}}>
                {isFirstPostInEvent ? 'First SyncIn!' : 'SyncIn Moment'}
              </span>
            </div>

            <div className="w-20"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </header>

      {/* Simple Upload Interface */}
      <div className="flex-1 flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center max-w-md mx-auto px-6">
          {/* Welcome Message */}
          {isFirstPostInEvent && (
            <div className="mb-8 p-6 rounded-2xl border" style={{backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'}}>
              <h2 className="text-xl font-bold mb-2" style={{color: '#166534'}}>
                Welcome to {event.title}! 👋
              </h2>
              <p className="text-sm leading-relaxed" style={{color: '#166534'}}>
                Share your first SyncIn moment to unlock this event's feed and connect with other attendees
              </p>
            </div>
          )}

          {/* Take Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-sm mx-auto px-8 py-6 rounded-2xl font-semibold text-lg transition-colors hover:opacity-90 flex items-center justify-center space-x-3 shadow-lg"
            style={{backgroundColor: '#6C63FF', color: 'white'}}
          >
            <Camera className="h-8 w-8" />
            <span>Click to Take Photo</span>
          </button>

          {/* Fun Description */}
          <div className="mt-6 text-center">
            <p className="text-sm" style={{color: '#6B7280'}}>
              📸 Capture your moment and share it with everyone! ✨
            </p>
          </div>

          {/* First Post Info */}
          {isFirstPostInEvent && (
            <div className="mt-8 p-4 rounded-lg border" style={{backgroundColor: '#EDE9FE', borderColor: '#C4B5FD'}}>
              <p className="text-sm" style={{color: '#6D28D9'}}>
                🔓 This will unlock this event's feed! Once you share, you'll be able to see and interact with all the moments from "{event.title}".
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Caption Modal */}
      {showCaptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{color: '#111827'}}>
                  Add Caption
                </h3>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{color: '#6C63FF'}}>{event.title}</p>
                </div>
                <button
                  onClick={() => {
                    setShowCaptionModal(false);
                    setCapturedPhoto('');
                    setPostCaption('');
                    setPostTags('');
                  }}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  style={{color: '#6B7280'}}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Photo Preview */}
              <div className="mb-4">
                <img 
                  src={capturedPhoto} 
                  alt="Captured photo"
                  className="w-full h-48 object-cover rounded-lg"
                />
                {isFirstPostInEvent && (
                  <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold text-white" style={{backgroundColor: '#22C55E'}}>
                    🎉 First Moment!
                  </div>
                )}
              </div>

              {/* Caption */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Caption *
                </label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none"
                  style={{color: '#111827', '--tw-ring-color': '#6C63FF'} as React.CSSProperties}
                  placeholder="Share what's happening at this moment..."
                  rows={3}
                  maxLength={300}
                  required
                />
                <div className="text-xs text-right mt-1" style={{color: '#9CA3AF'}}>
                  {postCaption.length}/300
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Tags (optional)
                </label>
                <input
                  type="text"
                  value={postTags}
                  onChange={(e) => setPostTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                  style={{color: '#111827', '--tw-ring-color': '#6C63FF'} as React.CSSProperties}
                  placeholder="#networking #fun #event"
                />
                <p className="text-xs mt-1" style={{color: '#9CA3AF'}}>
                  Add hashtags separated by spaces (max 10)
                </p>
              </div>

              {/* First Post Info */}
              {isFirstPostInEvent && (
                <div className="mb-4 p-3 rounded-lg border" style={{backgroundColor: '#F0FDF4', borderColor: '#BBF7D0'}}>
                  <p className="text-sm" style={{color: '#166534'}}>
                    🔓 This will unlock this event's feed! Once you share, you'll be able to see and interact with all the moments from "{event.title}".
                  </p>
                </div>
              )}

              {/* Approval Notice */}
              {event.moderationEnabled && event.requiresApproval && (
                <div className="mb-4 p-3 rounded-lg border" style={{backgroundColor: '#FFF4E6', borderColor: '#FED7AA'}}>
                  <p className="text-sm" style={{color: '#EA580C'}}>
                    📋 This moment will be reviewed before appearing in the feed.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-lg border" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
                  <p className="text-sm" style={{color: '#DC2626'}}>{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCaptionModal(false);
                    setCapturedPhoto('');
                    setPostCaption('');
                    setPostTags('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{color: '#6B7280'}}
                  disabled={isPosting}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePostSubmit}
                  disabled={isPosting || !postCaption.trim()}
                  className="flex-1 text-white px-4 py-3 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  {isPosting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {isFirstPostInEvent ? 'Share First Moment' : 'Share Moment'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}