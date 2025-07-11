// src/app/event/[eventUrl]/page.tsx
// Version: 1.0 - Event landing page for attendee QR code access

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, MapPin, Calendar, Clock, Users, ArrowRight, QrCode } from 'lucide-react';
import { getEventByUrl } from '@/lib/database';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { Event } from '@/types';
import { getThemeStyles, getThemeInlineStyles, getCardStyles } from '@/lib/theme-utils';

interface PageProps {
  params: Promise<{ eventUrl: string }>;
}

export default function EventLandingPage({ params }: PageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadEventUrl = async () => {
      try {
        const resolvedParams = await params;
        console.log('🔍 Resolved params:', resolvedParams);
        console.log('🌐 Event URL from params:', resolvedParams.eventUrl);
        setEventUrl(resolvedParams.eventUrl);
      } catch (error) {
        console.error('❌ Error resolving params:', error);
        setError('Invalid event URL');
      }
    };

    loadEventUrl();
  }, [params]);

  useEffect(() => {
    if (!eventUrl) {
      console.log('⏳ Waiting for eventUrl...');
      return;
    }

    const loadEvent = async () => {
      try {
        console.log('🔄 Loading event with URL:', eventUrl);
        
        if (!eventUrl || eventUrl.trim() === '') {
          throw new Error('Event URL is empty or invalid');
        }

        const eventData = await getEventByUrl(eventUrl);
        console.log('✅ Loaded event data:', eventData);
        
        if (!eventData) {
          setError('Event not found or no longer active');
          return;
        }
        
        // Check if event is active
        if (!eventData.isActive) {
          setError('This event is no longer accepting participants');
          return;
        }

        setEvent(eventData);
      } catch (error) {
        console.error('💥 Error loading event:', error);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventUrl]);

  const handleJoinEvent = () => {
    if (!event) return;
    
    // Check if user is already authenticated
    const user = getCurrentFirebaseUser();
    if (user) {
      // User is signed in, redirect to event prompts/camera
      router.push(`/event/${event.eventUrl}/prompts`);
    } else {
      // User needs to sign in, redirect to auth with return URL
      router.push(`/auth/signin?redirect=${encodeURIComponent(`/event/${event.eventUrl}/prompts`)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading event details...</p>
          <p className="text-sm mt-2" style={{color: '#9CA3AF'}}>Event URL: {eventUrl || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center max-w-md mx-auto px-4">
          <QrCode className="h-24 w-24 mx-auto mb-6" style={{color: '#D1D5DB'}} />
          <h1 className="text-2xl font-bold mb-4" style={{color: '#111827'}}>
            {error === 'Event not found or no longer active' ? 'Event Not Found' : 'Oops!'}
          </h1>
          <p className="mb-6" style={{color: '#6B7280'}}>
            {error || 'We couldn\'t load this event. Please check the QR code or link and try again.'}
          </p>
          <div className="space-y-3">
            <p className="text-sm" style={{color: '#9CA3AF'}}>
              Event URL: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{eventUrl}</span>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatEventDate = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateStr = start.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return { dateStr, timeStr };
  };

  const { dateStr, timeStr } = formatEventDate(event.startDate, event.endDate);

  // Get theme styles
  const theme = event?.theme || 'light';
  const themeStyles = getThemeStyles(theme);
  const themeInlineStyles = getThemeInlineStyles(theme);

  return (
    <div className={`min-h-screen ${themeStyles.background}`} style={themeInlineStyles}>
      {/* Header */}
      <header className={`${themeStyles.cardBackground} shadow-sm`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Camera className="h-8 w-8" style={{color: '#6C63FF'}} />
              <span className={`ml-2 text-xl font-bold ${themeStyles.textPrimary}`}>SyncIn</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Hero Section */}
        <div className={`${getCardStyles(theme)} rounded-xl shadow-sm overflow-hidden mb-8`}>
          {/* Cover Image Placeholder */}
          <div 
            className="h-48 md:h-64 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center"
            style={{backgroundColor: '#6C63FF'}}
          >
            {event.coverImageUrl && event.coverImageUrl.trim() !== '' ? (
              <img 
                src={event.coverImageUrl} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-80" />
                <p className="text-lg font-medium opacity-90">Photo Sharing Event</p>
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">
            {/* Event Title & Status */}
            <div className="flex items-start justify-between mb-4">
              <h1 className={`text-2xl md:text-3xl font-bold ${themeStyles.textPrimary}`}>
                {event.title}
              </h1>
              <div className="flex items-center space-x-2 ml-4">
                <div className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#22C55E'}}>
                  Live
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#FF9F1C'}}>
                  {event.stats.totalParticipants} joined
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <div className={`flex items-center ${themeStyles.textSecondary}`}>
                  <MapPin className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{event.location}</span>
                </div>
                <div className={`flex items-center ${themeStyles.textSecondary}`}>
                  <Calendar className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{dateStr}</span>
                </div>
                <div className={`flex items-center ${themeStyles.textSecondary}`}>
                  <Clock className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{timeStr}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className={`flex items-center ${themeStyles.textSecondary}`}>
                  <Users className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{event.stats.totalParticipants} participants</span>
                </div>
                <div className={`flex items-center ${themeStyles.textSecondary}`}>
                  <Camera className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span>{event.stats.totalPosts} photos shared</span>
                </div>
                <div className={`flex items-center ${themeStyles.textSecondary}`}>
                  <span className="h-5 w-5 mr-3 flex-shrink-0 text-center">❤️</span>
                  <span>{event.stats.totalLikes} likes</span>
                </div>
              </div>
            </div>

            {/* Event Description */}
            <div className="mb-8">
              <h3 className={`text-lg font-medium mb-3 ${themeStyles.textPrimary}`}>About This Event</h3>
              <p className={`text-base leading-relaxed ${themeStyles.textSecondary}`}>
                {event.description}
              </p>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 text-center">
              <h3 className={`text-xl font-bold mb-2 ${themeStyles.textPrimary}`}>
                Ready to join the fun? 📸
              </h3>
              <p className={`mb-6 ${themeStyles.textSecondary}`}>
                Connect with other attendees, share photos, and create memories together!
              </p>
              
              <button
                onClick={handleJoinEvent}
                className="text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors hover:opacity-90 inline-flex items-center shadow-lg"
                style={{backgroundColor: '#6C63FF'}}
              >
                Join Event
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              
              <div className={`mt-4 text-sm ${themeStyles.textMuted}`}>
                No app download required • Works in your browser
              </div>
            </div>
          </div>
        </div>

        {/* What Happens Next */}
        <div className={`${getCardStyles(theme)} rounded-xl shadow-sm p-6`}>
          <h3 className={`text-lg font-medium mb-4 ${themeStyles.textPrimary}`}>What happens next?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{backgroundColor: '#EDE9FE'}}>
                <span className="text-lg" style={{color: '#6C63FF'}}>1</span>
              </div>
              <h4 className="font-medium mb-2" style={{color: '#111827'}}>Sign in or create account</h4>
              <p className="text-sm" style={{color: '#6B7280'}}>Quick setup with Google or email</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{backgroundColor: '#FFF4E6'}}>
                <span className="text-lg" style={{color: '#FF9F1C'}}>2</span>
              </div>
              <h4 className="font-medium mb-2" style={{color: '#111827'}}>Answer a few questions</h4>
              <p className="text-sm" style={{color: '#6B7280'}}>Help others get to know you</p>
            </div>
            
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{backgroundColor: '#ECFDF5'}}>
                <span className="text-lg" style={{color: '#22C55E'}}>3</span>
              </div>
              <h4 className="font-medium mb-2" style={{color: '#111827'}}>Start sharing photos!</h4>
              <p className="text-sm" style={{color: '#6B7280'}}>Capture and share moments</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}