// src/app/user-profile/page.tsx
// Version: 1.0 - User profile view with event-specific content

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft,
  User,
  Camera,
  Instagram,
  Linkedin,
  Facebook,
  MapPin
} from 'lucide-react';
import { 
  getUser,
  getParticipantByUser,
  getUserPostsInEvent,
  getEvent
} from '@/lib/database';
import { User as UserType, EventParticipant, Post, Event } from '@/types';

function UserProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const userId = searchParams.get('userId');
  const eventId = searchParams.get('eventId');
  const eventUrl = searchParams.get('eventUrl');
  
  const [user, setUser] = useState<UserType | null>(null);
  const [participant, setParticipant] = useState<EventParticipant | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || !eventId || !eventUrl) {
      setError('Missing required parameters');
      setLoading(false);
      return;
    }

    const loadUserProfile = async () => {
      try {
        console.log('📱 Loading user profile:', { userId, eventId, eventUrl });

        // Load user data
        const userData = await getUser(userId);
        if (!userData) {
          setError('User not found');
          return;
        }
        setUser(userData);

        // Load event data
        const eventData = await getEvent(eventId);
        if (!eventData) {
          setError('Event not found');
          return;
        }
        setEvent(eventData);

        // Load participant data (for event-specific info like prompts)
        const participantData = await getParticipantByUser(eventId, userId);
        if (!participantData) {
          setError('User not found in this event');
          return;
        }
        setParticipant(participantData);

        // Load user's posts from this specific event only
        const posts = await getUserPostsInEvent(eventId, userId);
        setUserPosts(posts);

        console.log('✅ Profile loaded:', {
          user: userData.displayName,
          participant: participantData.displayName,
          posts: posts.length
        });

      } catch (error) {
        console.error('❌ Error loading user profile:', error);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId, eventId, eventUrl]);

  const handleBack = () => {
    if (eventUrl) {
      router.push(`/event/${eventUrl}/feed`);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user || !participant || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4" style={{color: '#111827'}}>Profile Not Found</h1>
          <p className="mb-6" style={{color: '#6B7280'}}>{error}</p>
          <button
            onClick={handleBack}
            className="inline-block text-white px-6 py-2 rounded-lg transition-colors hover:opacity-90"
            style={{backgroundColor: '#6C63FF'}}
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center"
              style={{color: '#6B7280'}}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to Feed</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-bold" style={{color: '#111827'}}>Profile</h1>
              <p className="text-sm" style={{color: '#6B7280'}}>{event.title}</p>
            </div>

            <div className="w-20"></div> {/* Spacer for center alignment */}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 overflow-hidden" style={{backgroundColor: '#EDE9FE'}}>
                {user.profilePhotoUrl ? (
                  <img
                    src={user.profilePhotoUrl}
                    alt={participant.displayName || 'Profile photo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12" style={{color: '#6C63FF'}} />
                )}
              </div>

              {/* Name */}
              <h2 className="text-2xl font-bold mb-2" style={{color: '#111827'}}>
                {participant.displayName || user.displayName}
              </h2>

              {/* Event Context */}
              <div className="flex items-center mb-6" style={{color: '#6B7280'}}>
                <MapPin className="h-4 w-4 mr-1" />
                <span className="text-sm">SyncIn • {event.location}</span>
              </div>

              {/* Social Links */}
              {(user.socialProfiles?.instagram || user.socialProfiles?.linkedin || user.socialProfiles?.facebook) && (
                <div className="flex flex-wrap gap-4 justify-center">
                  {user.socialProfiles?.instagram && (
                    <a
                      href={`https://instagram.com/${user.socialProfiles.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{color: '#6C63FF'}}
                    >
                      <Instagram className="h-4 w-4 mr-1" />
                      @{user.socialProfiles.instagram}
                    </a>
                  )}
                  {user.socialProfiles?.linkedin && (
                    <a
                      href={user.socialProfiles.linkedin.startsWith('http') ? user.socialProfiles.linkedin : `https://linkedin.com/in/${user.socialProfiles.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{color: '#6C63FF'}}
                    >
                      <Linkedin className="h-4 w-4 mr-1" />
                      LinkedIn
                    </a>
                  )}
                  {user.socialProfiles?.facebook && (
                    <a
                      href={`https://facebook.com/${user.socialProfiles.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{color: '#6C63FF'}}
                    >
                      <Facebook className="h-4 w-4 mr-1" />
                      Facebook
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Event Prompts Answers */}
          {participant.promptResponses && Object.keys(participant.promptResponses).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4" style={{color: '#111827'}}>
                About {participant.displayName}
              </h3>
              <div className="space-y-4">
                {Object.entries((participant.promptResponses as unknown) as Record<string, string>).map(([promptId, answer], index) => {
                  // Find the corresponding prompt in the event prompts
                  const prompt = event.prompts?.find(p => p.id === promptId);
                  const question = prompt?.question || `Question ${index + 1}`;
                  
                  return (
                    <div key={index} className="border-l-4 pl-4" style={{borderColor: '#6C63FF'}}>
                      <h4 className="text-sm font-medium mb-1" style={{color: '#6B7280'}}>
                        {question}
                      </h4>
                      <p className="text-base" style={{color: '#111827'}}>
                        {answer}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Posts from this Event */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{color: '#111827'}}>
                Moments from {event.title}
              </h3>
              <div className="flex items-center text-sm" style={{color: '#6B7280'}}>
                <Camera className="h-4 w-4 mr-1" />
                {userPosts.length} {userPosts.length === 1 ? 'photo' : 'photos'}
              </div>
            </div>

            {userPosts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {userPosts.map((post) => (
                  <div 
                    key={post.id} 
                    className="group cursor-pointer"
                    onClick={() => router.push(`/event/${eventUrl}/feed?postId=${post.id}`)}
                  >
                    <div className="aspect-square rounded-lg overflow-hidden" style={{backgroundColor: '#F3F4F6'}}>
                      <img
                        src={post.imageUrl}
                        alt={post.caption || 'Event photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    {post.caption && (
                      <p className="text-sm mt-2 line-clamp-2" style={{color: '#6B7280'}}>
                        {post.caption}
                      </p>
                    )}
                    <div className="flex items-center text-xs mt-1 space-x-3" style={{color: '#9CA3AF'}}>
                      <span>❤️ {post.likesCount}</span>
                      <span>💬 {post.commentsCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{backgroundColor: '#F3F4F6'}}>
                  <Camera className="h-8 w-8" style={{color: '#9CA3AF'}} />
                </div>
                <p className="text-base font-medium mb-1" style={{color: '#111827'}}>
                  No moments shared yet
                </p>
                <p className="text-sm" style={{color: '#6B7280'}}>
                  {participant.displayName} hasn't shared any photos from this event
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UserProfilePageContent />
    </Suspense>
  );
}