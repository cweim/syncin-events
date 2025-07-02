// src/app/dashboard/events/[eventId]/page.tsx
// Version: 2.0 - Fixed params handling for Next.js 15

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, QrCode, Settings, Users, Camera, Copy, ExternalLink, MapPin, Calendar, Clock } from 'lucide-react';
import QRCodeReact from 'react-qr-code';
import { getEvent } from '@/lib/database';
import { Event } from '@/types';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventDetailsPage({ params }: PageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'qr' | 'settings'>('overview');
  const [copySuccess, setCopySuccess] = useState(false);
  const [eventId, setEventId] = useState<string>('');

  useEffect(() => {
    const loadEventId = async () => {
      try {
        const resolvedParams = await params;
        console.log('🔍 Resolved params:', resolvedParams);
        console.log('🆔 Event ID from params:', resolvedParams.eventId);
        setEventId(resolvedParams.eventId);
      } catch (error) {
        console.error('❌ Error resolving params:', error);
      }
    };

    loadEventId();
  }, [params]);

  useEffect(() => {
    if (!eventId) {
      console.log('⏳ Waiting for eventId...');
      return;
    }

    const loadEvent = async () => {
      try {
        console.log('🔄 Loading event with ID:', eventId);
        
        // Validate eventId
        if (!eventId || eventId.trim() === '') {
          throw new Error('Event ID is empty or invalid');
        }

        const eventData = await getEvent(eventId);
        console.log('✅ Loaded event data:', eventData);
        
        if (!eventData) {
          throw new Error('Event not found in database');
        }
        
        setEvent(eventData);
      } catch (error) {
        console.error('💥 Error loading event:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  const handleCopyUrl = async () => {
    if (!event) return;
    
    const eventUrl = `${window.location.origin}/event/${event.eventUrl}`;
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleCopyQR = () => {
    // You could implement QR code download here
    console.log('Download QR code functionality would go here');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
          <p className="text-sm text-gray-400 mt-2">Event ID: {eventId || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <p className="text-gray-600 mb-4">
            We couldn't find an event with ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{eventId}</span>
          </p>
          <div className="space-x-2">
            <Link 
              href="/dashboard" 
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Return to Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.eventUrl}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center text-gray-600 hover:text-gray-900 mr-6">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                <p className="text-gray-600">Event Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                event.status === 'live' ? 'bg-green-100 text-green-800' : 
                event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{event.stats.totalParticipants}</p>
                <p className="text-gray-600">Participants</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Camera className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{event.stats.totalPosts}</p>
                <p className="text-gray-600">Photos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <div className="text-green-600 text-lg">❤️</div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{event.stats.totalLikes}</p>
                <p className="text-gray-600">Likes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="bg-orange-100 p-3 rounded-lg">
                <div className="text-orange-600 text-lg">💬</div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{event.stats.totalComments}</p>
                <p className="text-gray-600">Comments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'qr'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                QR Code & Sharing
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Event Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Event Details</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="h-5 w-5 mr-2" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center text-gray-600 mb-3">
                        <Calendar className="h-5 w-5 mr-2" />
                        <span>{new Date(event.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2" />
                        <span>
                          {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600">{event.description}</p>
                    </div>
                  </div>
                </div>

                {/* Interaction Prompts */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Interaction Prompts</h3>
                  <div className="space-y-3">
                    {event.prompts && Array.isArray(event.prompts) && event.prompts.length > 0 ? (
                      event.prompts.map((prompt, index) => (
                        <div key={prompt.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                prompt.type === 'text' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                              }`}>
                                {prompt.type === 'text' ? 'Short Text' : 'Multiple Choice'}
                              </span>
                              {prompt.required && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 mb-2">{prompt.question}</p>
                          {prompt.type === 'multipleChoice' && prompt.options && Array.isArray(prompt.options) && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600 mb-1">Options:</p>
                              <ul className="list-disc list-inside text-sm text-gray-600">
                                {prompt.options.map((option, optIndex) => (
                                  <li key={optIndex}>{option}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-6 text-center">
                        <p className="text-gray-500">No interaction prompts configured for this event.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">QR Code for Event Access</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center">
                        <QRCodeReact
                          value={eventUrl}
                          size={200}
                          style={{ margin: '0 auto' }}
                        />
                        <p className="text-sm text-gray-600 mt-4">
                          Attendees scan this QR code to join the event
                        </p>
                      </div>
                      <button
                        onClick={handleCopyQR}
                        className="w-full mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Download QR Code
                      </button>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Event URL</h4>
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <code className="text-sm text-gray-800 break-all">{eventUrl}</code>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCopyUrl}
                          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copySuccess ? 'Copied!' : 'Copy URL'}
                        </button>
                        <a
                          href={eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Event
                        </a>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-3">How to Share</h4>
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li>• Display the QR code on screens or posters at your venue</li>
                          <li>• Share the event URL on social media or email</li>
                          <li>• Download and print the QR code for physical materials</li>
                          <li>• Attendees scan or visit the link to join instantly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Event Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Event Status</h4>
                        <p className="text-sm text-gray-600">Control whether attendees can join the event</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {event.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Visibility</h4>
                        <p className="text-sm text-gray-600">Who can find and join this event</p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {event.visibility.charAt(0).toUpperCase() + event.visibility.slice(1)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Guest Posting</h4>
                        <p className="text-sm text-gray-600">Allow non-registered users to post photos</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.allowGuestPosting ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {event.allowGuestPosting ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">Moderation</h4>
                        <p className="text-sm text-gray-600">Review posts before they appear publicly</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.moderationEnabled ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {event.moderationEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Danger Zone</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">Delete Event</h4>
                    <p className="text-sm text-red-600 mb-4">
                      Permanently delete this event and all associated data. This action cannot be undone.
                    </p>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      Delete Event
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}