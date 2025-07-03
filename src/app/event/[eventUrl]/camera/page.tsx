// src/app/event/[eventUrl]/camera/page.tsx
// Version: 1.2 - Fixed auto-approval and ensured stats updates

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
  Send,
  Image as ImageIcon,
  Users,
  Heart,
  MessageCircle,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getEventByUrl, 
  getParticipantByUser, 
  createPost, 
  getEventPosts,
  updateParticipant 
} from '@/lib/database';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Event, EventParticipant, Post, CreatePostData } from '@/types';

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

  // Camera states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string>('');

  // Photo sharing states
  const [showPostModal, setShowPostModal] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postTags, setPostTags] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Feed states
  const [eventPosts, setEventPosts] = useState<Post[]>([]);
  const [showFeed, setShowFeed] = useState(false);

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

        // Load event posts for feed
        const posts = await getEventPosts(eventData.id);
        setEventPosts(posts);

        // Determine if feed should be shown (user has posted or not gated)
        setShowFeed(participantData.hasPosted);

        console.log('👤 Participant data:', participantData);
        console.log('📸 Has posted:', participantData.hasPosted);
        console.log('👁️ Show feed:', participantData.hasPosted);
        console.log('🔧 Moderation enabled:', eventData.moderationEnabled);

      } catch (error) {
        console.error('💥 Error loading event data:', error);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [eventUrl, currentUser, router]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: { 
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions or use file upload.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setTimeout(startCamera, 100); // Small delay to ensure cleanup
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    // Apply flash effect
    if (flashEnabled) {
      document.body.style.backgroundColor = 'white';
      setTimeout(() => {
        document.body.style.backgroundColor = '';
      }, 100);
    }

    context.drawImage(videoRef.current, 0, 0);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoDataUrl);
    setShowPostModal(true);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedPhoto(e.target?.result as string);
        setShowPostModal(true);
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
  
    setIsPosting(true);
    setError('');

    try {
      console.log('📝 Starting post submission...');
      console.log('🔧 Event moderation enabled:', event.moderationEnabled);

      // Upload photo
      const imageUrl = await uploadPhoto(capturedPhoto);
      console.log('📸 Photo uploaded:', imageUrl);

      // Parse tags and clean them
      const tagsArray = postTags
        .split(' ')
        .filter(tag => tag.startsWith('#'))
        .map(tag => tag.toLowerCase().trim())
        .filter(tag => tag.length > 1); // Remove empty or single character tags

      // ✅ CRITICAL FIX: Ensure auto-approval when moderation is disabled
      const shouldAutoApprove = !event.moderationEnabled;
      console.log('✅ Auto-approve:', shouldAutoApprove);

      // Create post data without undefined values
      const postData: CreatePostData = {
        eventId: event.id,
        participantId: participant.id,
        userId: currentUser.uid,
        imageUrl,
        isApproved: shouldAutoApprove, // ✅ Key fix: auto-approve if moderation disabled
        isReported: false,
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

      // Update participant as having posted (unlocks feed)
      if (!participant.hasPosted) {
        console.log('🔓 Updating participant hasPosted status...');
        await updateParticipant(participant.id, { 
          hasPosted: true,
          postsCount: participant.postsCount + 1 
        });
        setParticipant(prev => prev ? { ...prev, hasPosted: true, postsCount: prev.postsCount + 1 } : null);
        setShowFeed(true);
        console.log('✅ Participant updated - hasPosted: true');
      } else {
        // Still increment post count for existing posters
        await updateParticipant(participant.id, { 
          postsCount: participant.postsCount + 1 
        });
        setParticipant(prev => prev ? { ...prev, postsCount: prev.postsCount + 1 } : null);
      }

      // Reset modal
      setShowPostModal(false);
      setCapturedPhoto('');
      setPostCaption('');
      setPostTags('');

      console.log('🎉 Post submission completed successfully!');

      // Show success message and redirect
      alert('Photo shared successfully! 🎉');

      // Redirect to feed after successful post
      router.push(`/event/${eventUrl}/feed`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share photo';
      setError(errorMessage);
      console.error('💥 Error posting photo:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const downloadPhoto = async (imageUrl: string, filename: string = 'photo.jpg') => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading photo:', error);
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
          <h1 className="text-2xl font-bold mb-4" style={{color: '#111827'}}>Unable to Access Event</h1>
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
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#111827'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href={`/event/${eventUrl}`} className="flex items-center" style={{color: '#6B7280'}}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back</span>
            </Link>
            
            <div className="flex items-center">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-lg font-bold" style={{color: '#111827'}}>{event.title}</span>
            </div>

            <button
              onClick={() => setShowFeed(!showFeed)}
              className="flex items-center text-sm"
              style={{color: showFeed ? '#6C63FF' : '#6B7280'}}
              title={participant?.hasPosted ? 'Toggle feed visibility' : 'Post a photo first to unlock the feed'}
            >
              {showFeed ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showFeed ? 'Hide Feed' : `${participant?.hasPosted ? 'Show Feed' : 'Feed Locked'}`}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Camera Section */}
        <div className="flex-1 flex flex-col">
          {/* Camera View */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {cameraActive && stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-white">
                <Camera className="h-24 w-24 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-4">Ready to capture memories?</p>
                <button
                  onClick={startCamera}
                  className="text-white px-6 py-3 rounded-lg font-semibold transition-colors hover:opacity-90"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  Start Camera
                </button>
              </div>
            )}

            {/* Camera Controls Overlay */}
            {cameraActive && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <div className="flex items-center justify-between">
                  {/* Flash Toggle */}
                  <button
                    onClick={() => setFlashEnabled(!flashEnabled)}
                    className={`p-3 rounded-full transition-colors ${
                      flashEnabled ? 'bg-yellow-500' : 'bg-white/20'
                    }`}
                  >
                    {flashEnabled ? 
                      <Zap className="h-6 w-6 text-white" /> : 
                      <ZapOff className="h-6 w-6 text-white" />
                    }
                  </button>

                  {/* Capture Button */}
                  <button
                    onClick={capturePhoto}
                    className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full"></div>
                  </button>

                  {/* Switch Camera */}
                  <button
                    onClick={switchCamera}
                    className="p-3 rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  >
                    <RotateCcw className="h-6 w-6 text-white" />
                  </button>
                </div>

                {/* Upload Option */}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-white/80 hover:text-white transition-colors flex items-center mx-auto"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="text-sm">Upload from gallery</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Gated Access Message */}
          {!participant.hasPosted && (
            <div className="bg-white border-t p-4">
              <div className="max-w-md mx-auto text-center">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{backgroundColor: '#FFF4E6'}}>
                  <Camera className="h-6 w-6" style={{color: '#FF9F1C'}} />
                </div>
                <h3 className="font-medium mb-2" style={{color: '#111827'}}>Share a photo to unlock the feed!</h3>
                <p className="text-sm" style={{color: '#6B7280'}}>
                  Post your first photo to see what others are sharing at {event.title}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Feed Section */}
        {(showFeed && (participant.hasPosted || eventPosts.length === 0)) && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold flex items-center" style={{color: '#111827'}}>
                <ImageIcon className="h-5 w-5 mr-2" />
                Event Photos
                {!participant.hasPosted && (
                  <span className="ml-2 text-xs px-2 py-1 rounded-full text-white" style={{backgroundColor: '#FF9F1C'}}>
                    Preview
                  </span>
                )}
              </h3>
              <p className="text-sm" style={{color: '#6B7280'}}>
                {eventPosts.length} photos shared
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {eventPosts.length > 0 ? (
                <div className="space-y-4 p-4">
                  {eventPosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <img 
                        src={post.imageUrl} 
                        alt={post.caption || 'Event photo'}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        {post.caption && (
                          <p className="text-sm mb-2" style={{color: '#111827'}}>{post.caption}</p>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {post.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="text-xs px-2 py-1 rounded-full"
                                style={{backgroundColor: '#EDE9FE', color: '#6C63FF'}}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm" style={{color: '#6B7280'}}>
                            <span className="flex items-center">
                              <Heart className="h-4 w-4 mr-1" />
                              {post.likesCount}
                            </span>
                            <span className="flex items-center">
                              <MessageCircle className="h-4 w-4 mr-1" />
                              {post.commentsCount}
                            </span>
                          </div>
                          <button
                            onClick={() => downloadPhoto(post.imageUrl, `${event.title}-photo-${post.id}.jpg`)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            style={{color: '#6B7280'}}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-3" style={{color: '#D1D5DB'}} />
                    <p className="text-sm" style={{color: '#6B7280'}}>No photos yet</p>
                    <p className="text-xs" style={{color: '#9CA3AF'}}>Be the first to share!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4" style={{color: '#111827'}}>
                Share your photo
              </h3>

              {/* Photo Preview */}
              <div className="mb-4">
                <img 
                  src={capturedPhoto} 
                  alt="Captured photo"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

              {/* Caption */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Caption (optional)
                </label>
                <textarea
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  style={{color: '#111827'}}
                  placeholder="What's happening at this moment?"
                  rows={3}
                  maxLength={300}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  style={{color: '#111827'}}
                  placeholder="#networking #fun #startup"
                />
                <p className="text-xs mt-1" style={{color: '#9CA3AF'}}>
                  Add hashtags separated by spaces
                </p>
              </div>

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
                    setShowPostModal(false);
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
                  disabled={isPosting}
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
                      <Send className="h-4 w-4 mr-2" />
                      Share Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Canvas for Photo Capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
}