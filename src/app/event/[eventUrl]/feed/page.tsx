// src/app/event/[eventUrl]/feed/page.tsx
// Version: 1.0 - Event feed page with onboarding flow for first-time users

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  ArrowLeft, 
  Users, 
  Heart,
  MessageCircle,
  Download,
  Sparkles,
  Image as ImageIcon,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getEventByUrl, 
  getParticipantByUser, 
  getEventPosts,
  getEventParticipants
} from '@/lib/database';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { Event, EventParticipant, Post } from '@/types';

interface PageProps {
  params: Promise<{ eventUrl: string }>;
}

export default function EventFeedPage({ params }: PageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [eventPosts, setEventPosts] = useState<Post[]>([]);
  const [allParticipants, setAllParticipants] = useState<EventParticipant[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(true);

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

        // Load event posts and participants
        const [posts, participants] = await Promise.all([
          getEventPosts(eventData.id),
          getEventParticipants(eventData.id)
        ]);

        setEventPosts(posts);
        setAllParticipants(participants);

        console.log('👤 Participant data:', participantData);
        console.log('📸 Has posted:', participantData.hasPosted);
        console.log('📋 Total posts:', posts.length);

      } catch (error) {
        console.error('💥 Error loading event data:', error);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    loadEventData();
  }, [eventUrl, currentUser, router]);

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
          <p style={{color: '#6B7280'}}>Loading event feed...</p>
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
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/event/${eventUrl}`} className="flex items-center" style={{color: '#6B7280'}}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to Event</span>
            </Link>
            
            <div className="flex items-center">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-lg font-bold" style={{color: '#111827'}}>{event.title}</span>
            </div>

            <Link
              href={`/event/${eventUrl}/camera`}
              className="flex items-center text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
              style={{backgroundColor: '#6C63FF'}}
            >
              <Camera className="h-4 w-4 mr-1" />
              Camera
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Event Stats Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold" style={{color: '#6C63FF'}}>{allParticipants.length}</div>
              <div className="text-sm" style={{color: '#6B7280'}}>Participants</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{color: '#FF9F1C'}}>{eventPosts.length}</div>
              <div className="text-sm" style={{color: '#6B7280'}}>Photos Shared</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{color: '#22C55E'}}>
                {eventPosts.reduce((sum, post) => sum + post.likesCount, 0)}
              </div>
              <div className="text-sm" style={{color: '#6B7280'}}>Total Likes</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{color: '#8B5CF6'}}>
                {eventPosts.reduce((sum, post) => sum + post.commentsCount, 0)}
              </div>
              <div className="text-sm" style={{color: '#6B7280'}}>Comments</div>
            </div>
          </div>
        </div>

        {/* First Time User Onboarding */}
        {!participant.hasPosted && showOnboarding && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 mb-6 text-white">
            <div className="text-center">
              <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-90" />
              <h2 className="text-2xl font-bold mb-2">Welcome to {event.title}! 🎉</h2>
              <p className="text-lg mb-6 opacity-90">
                You're all set! Now it's time to capture and share your first moment.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href={`/event/${eventUrl}/camera`}
                  className="bg-white text-indigo-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center shadow-lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Your First Photo
                </Link>
                
                <button
                  onClick={() => setShowOnboarding(false)}
                  className="text-white/80 hover:text-white transition-colors flex items-center text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview Photos First
                </button>
              </div>
              
              <div className="mt-6 text-sm opacity-75">
                💡 Tip: Once you share a photo, you'll unlock the full feed experience!
              </div>
            </div>
          </div>
        )}

        {/* Feed Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{color: '#111827'}}>
                Event Photos
              </h2>
              {!participant.hasPosted && (
                <div className="flex items-center text-sm" style={{color: '#FF9F1C'}}>
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Share a photo to unlock full access
                </div>
              )}
            </div>

            {eventPosts.length > 0 ? (
              <div className="space-y-6">
                {/* Show limited posts for users who haven't posted */}
                {(participant.hasPosted ? eventPosts : eventPosts.slice(0, 3)).map((post) => (
                  <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <img 
                      src={post.imageUrl} 
                      alt={post.caption || 'Event photo'}
                      className="w-full h-64 sm:h-80 object-cover"
                    />
                    <div className="p-4">
                      {post.caption && (
                        <p className="text-base mb-3" style={{color: '#111827'}}>{post.caption}</p>
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
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

                {/* Show more prompt for non-posters */}
                {!participant.hasPosted && eventPosts.length > 3 && (
                  <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4" style={{color: '#D1D5DB'}} />
                    <h3 className="text-lg font-semibold mb-2" style={{color: '#111827'}}>
                      {eventPosts.length - 3} more photos waiting! 📸
                    </h3>
                    <p className="mb-4" style={{color: '#6B7280'}}>
                      Share your first photo to see all {eventPosts.length} photos from this event.
                    </p>
                    <Link
                      href={`/event/${eventUrl}/camera`}
                      className="inline-flex items-center text-white px-6 py-3 rounded-lg font-semibold transition-colors hover:opacity-90"
                      style={{backgroundColor: '#6C63FF'}}
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Take First Photo
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4" style={{color: '#D1D5DB'}} />
                <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>
                  No photos yet!
                </h3>
                <p className="mb-6" style={{color: '#6B7280'}}>
                  Be the first to share a moment from {event.title}
                </p>
                <Link
                  href={`/event/${eventUrl}/camera`}
                  className="inline-flex items-center text-white px-6 py-3 rounded-lg font-semibold transition-colors hover:opacity-90"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Share First Photo
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Action */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-4" style={{color: '#111827'}}>Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href={`/event/${eventUrl}/camera`}
                  className="w-full text-white py-3 rounded-lg font-medium transition-colors hover:opacity-90 flex items-center justify-center"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {participant.hasPosted ? 'Share Another Photo' : 'Share First Photo'}
                </Link>
                
                {participant.hasPosted && (
                  <button className="w-full border border-gray-300 py-3 rounded-lg font-medium transition-colors hover:bg-gray-50 flex items-center justify-center">
                    <Users className="h-4 w-4 mr-2" style={{color: '#6B7280'}} />
                    <span style={{color: '#6B7280'}}>View Participants</span>
                  </button>
                )}
              </div>
            </div>

            {/* Event Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-3" style={{color: '#111827'}}>About Event</h3>
              <p className="text-sm mb-4" style={{color: '#6B7280'}}>{event.description}</p>
              <div className="text-xs space-y-1" style={{color: '#9CA3AF'}}>
                <p><strong>Location:</strong> {event.location}</p>
                <p><strong>Date:</strong> {new Date(event.startDate).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Your Status */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold mb-3" style={{color: '#111827'}}>Your Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{color: '#6B7280'}}>Photos shared:</span>
                  <span className="font-medium" style={{color: '#111827'}}>{participant.postsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: '#6B7280'}}>Likes received:</span>
                  <span className="font-medium" style={{color: '#111827'}}>{participant.likesReceived}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{color: '#6B7280'}}>Comments received:</span>
                  <span className="font-medium" style={{color: '#111827'}}>{participant.commentsReceived}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}