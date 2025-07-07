// src/app/my-events/page.tsx
// Version: 1.2 - Fixed getEvent import and removed placeholder

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  Calendar, 
  MapPin, 
  Users, 
  Image as ImageIcon,
  Heart,
  ArrowRight,
  Settings,
  LogOut,
  Clock
} from 'lucide-react';
import { getCurrentFirebaseUser, signOutUser, getUserEventHistory } from '@/lib/auth';
import { 
  getUser, 
  getEvent,
  getEventParticipants, 
  getEventPosts 
} from '@/lib/database';
import { User, Event, EventParticipant, Post } from '@/types';

interface EventHistoryItem {
  event: Event;
  participant: EventParticipant;
  userPosts: Post[];
  totalEventPosts: number;
}

export default function MyEventsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check authentication
    const user = getCurrentFirebaseUser();
    if (!user) {
      router.push('/auth/signin?redirect=/my-events');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const loadUserData = async () => {
      try {
        // Get user data
        const user = await getUser(currentUser.uid);
        if (!user) {
          setError('User profile not found');
          return;
        }
        setUserData(user);

        // Get user's event history
        const eventIds = await getUserEventHistory(currentUser.uid);
        const historyItems: EventHistoryItem[] = [];

        for (const eventId of eventIds) {
          try {
            // Get event details
            const event = await getEvent(eventId);
            if (!event) continue;

            // Get user's participation in this event
            const participants = await getEventParticipants(eventId);
            const userParticipant = participants.find(p => p.userId === currentUser.uid);
            if (!userParticipant) continue;

            // Get all posts for this event
            const allPosts = await getEventPosts(eventId);
            const userPosts = allPosts.filter(post => post.userId === currentUser.uid);

            historyItems.push({
              event,
              participant: userParticipant,
              userPosts,
              totalEventPosts: allPosts.length
            });
          } catch (error) {
            console.error(`Error loading event ${eventId}:`, error);
            // Continue with other events
          }
        }

        // Sort by most recent first
        historyItems.sort((a, b) => 
          new Date(b.participant.joinedAt).getTime() - new Date(a.participant.joinedAt).getTime()
        );

        setEventHistory(historyItems);
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load your events');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatEventDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-2xl font-bold" style={{color: '#111827'}}>SyncIn</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="flex items-center text-sm hover:text-gray-900 transition-colors"
                style={{color: '#6B7280'}}
              >
                <Settings className="h-4 w-4 mr-1" />
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center text-sm hover:text-gray-900 transition-colors"
                style={{color: '#6B7280'}}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Section */}
        {userData && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {userData.profilePhotoUrl ? (
                  <img
                    src={userData.profilePhotoUrl}
                    alt={userData.displayName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Camera className="h-8 w-8" style={{color: '#9CA3AF'}} />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold" style={{color: '#111827'}}>
                  Welcome back, {userData.displayName}! 👋
                </h1>
                <p style={{color: '#6B7280'}}>
                  You've attended {userData.eventsAttended} events and created amazing memories
                </p>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold" style={{color: '#6C63FF'}}>
                  {userData.eventsAttended}
                </div>
                <div className="text-sm" style={{color: '#6B7280'}}>Events Attended</div>
              </div>
            </div>

            {/* Social Profiles */}
            {userData.socialProfiles && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4 text-sm">
                  <span style={{color: '#6B7280'}}>Connect:</span>
                  {userData.socialProfiles.instagram && (
                    <a
                      href={`https://instagram.com/${userData.socialProfiles.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700"
                    >
                      @{userData.socialProfiles.instagram}
                    </a>
                  )}
                  {userData.socialProfiles.linkedin && (
                    <a
                      href={`https://linkedin.com/in/${userData.socialProfiles.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      LinkedIn
                    </a>
                  )}
                  {userData.socialProfiles.facebook && (
                    <a
                      href={`https://facebook.com/${userData.socialProfiles.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-800 hover:text-blue-900"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Events History */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{color: '#111827'}}>Your Events</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg border" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
              <p className="text-sm" style={{color: '#DC2626'}}>{error}</p>
            </div>
          )}

          {eventHistory.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventHistory.map((item, index) => (
                <div key={item.event.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Event Image */}
                  <div className="h-48 bg-gradient-to-br from-indigo-400 to-purple-500 relative">
                    {item.event.coverImageUrl ? (
                      <img 
                        src={item.event.coverImageUrl} 
                        alt={item.event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="h-16 w-16 text-white opacity-50" />
                      </div>
                    )}
                    
                    {/* Event Status Badge */}
                    <div className="absolute top-3 right-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.event.status === 'live' ? 'bg-green-500 text-white' :
                        item.event.status === 'ended' ? 'bg-gray-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {item.event.status === 'live' ? 'Active' : 
                         item.event.status === 'ended' ? 'Ended' : 'Draft'}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Event Title & Date */}
                    <h3 className="font-bold text-lg mb-2" style={{color: '#111827'}}>
                      {item.event.title}
                    </h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm" style={{color: '#6B7280'}}>
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatEventDate(item.event.startDate)}
                      </div>
                      <div className="flex items-center text-sm" style={{color: '#6B7280'}}>
                        <MapPin className="h-4 w-4 mr-2" />
                        {item.event.location}
                      </div>
                      <div className="flex items-center text-sm" style={{color: '#6B7280'}}>
                        <Clock className="h-4 w-4 mr-2" />
                        Joined {getTimeAgo(item.participant.joinedAt)}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold" style={{color: '#6C63FF'}}>
                          {item.userPosts.length}
                        </div>
                        <div className="text-xs" style={{color: '#6B7280'}}>Your Photos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold" style={{color: '#FF9F1C'}}>
                          {item.totalEventPosts}
                        </div>
                        <div className="text-xs" style={{color: '#6B7280'}}>Total Photos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold" style={{color: '#22C55E'}}>
                          {item.participant.likesReceived}
                        </div>
                        <div className="text-xs" style={{color: '#6B7280'}}>Likes Received</div>
                      </div>
                    </div>

                    {/* User's Photo Preview */}
                    {item.userPosts.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2" style={{color: '#111827'}}>Your photos:</p>
                        <div className="flex space-x-2 overflow-x-auto">
                          {item.userPosts.slice(0, 3).map((post) => (
                            <img
                              key={post.id}
                              src={post.imageUrl}
                              alt="Your photo"
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                          {item.userPosts.length > 3 && (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-xs" style={{color: '#6B7280'}}>
                                +{item.userPosts.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Event Button */}
                    <Link
                      href={`/event/${item.event.eventUrl}/feed`}
                      className="w-full text-white py-2 rounded-lg font-medium transition-colors hover:opacity-90 flex items-center justify-center"
                      style={{backgroundColor: '#6C63FF'}}
                    >
                      View Event
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Camera className="h-16 w-16 mx-auto mb-4" style={{color: '#D1D5DB'}} />
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>
                No events yet
              </h3>
              <p className="mb-6" style={{color: '#6B7280'}}>
                Join your first event to start creating memories and connecting with others!
              </p>
              <Link
                href="/"
                className="inline-block text-white px-6 py-3 rounded-lg font-semibold transition-colors hover:opacity-90"
                style={{backgroundColor: '#6C63FF'}}
              >
                Scan QR Code to Join Event
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4" style={{color: '#111827'}}>Quick Actions</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link
              href="/profile"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors"
            >
              <Settings className="h-8 w-8 mr-4" style={{color: '#6C63FF'}} />
              <div>
                <h4 className="font-medium" style={{color: '#111827'}}>Edit Profile</h4>
                <p className="text-sm" style={{color: '#6B7280'}}>Update your photo and social links</p>
              </div>
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 transition-colors"
            >
              <LogOut className="h-8 w-8 mr-4" style={{color: '#EF4444'}} />
              <div className="text-left">
                <h4 className="font-medium" style={{color: '#111827'}}>Sign Out</h4>
                <p className="text-sm" style={{color: '#6B7280'}}>Sign out of your account</p>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}