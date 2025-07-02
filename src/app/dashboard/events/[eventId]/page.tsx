// src/app/dashboard/events/[eventId]/page.tsx
// Version: 3.1 - Fix multiple choice options display

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

  const getOptionsArray = (options: any): string[] => {
    if (!options) return [];
    
    // If it's already an array, return it
    if (Array.isArray(options)) {
      return options;
    }
    
    // If it's an object with numeric keys (converted array), convert back to array
    if (typeof options === 'object') {
      const keys = Object.keys(options);
      const isNumericKeys = keys.every(key => /^\d+$/.test(key));
      
      if (isNumericKeys) {
        return keys
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(key => options[key])
          .filter(value => value && value.trim && value.trim() !== '');
      }
    }
    
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading event details...</p>
          <p className="text-sm mt-2" style={{color: '#9CA3AF'}}>Event ID: {eventId || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{color: '#111827'}}>Event Not Found</h1>
          <p className="mb-4" style={{color: '#6B7280'}}>
            We couldn't find an event with ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{eventId}</span>
          </p>
          <div className="space-x-2">
            <Link 
              href="/dashboard" 
              className="inline-block text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
              style={{backgroundColor: '#6C63FF'}}
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
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center hover:text-gray-900 mr-6 transition-colors" style={{color: '#6B7280'}}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold" style={{color: '#111827'}}>{event.title}</h1>
                <p style={{color: '#6B7280'}}>Event Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                event.status === 'live' ? 'text-white' : 
                event.status === 'draft' ? 'text-orange-800' :
                'text-gray-800'
              }`} style={{
                backgroundColor: event.status === 'live' ? '#22C55E' : 
                                event.status === 'draft' ? '#FFF4E6' :
                                '#F3F4F6'
              }}>
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
              <div className="p-3 rounded-lg" style={{backgroundColor: '#EDE9FE'}}>
                <Users className="h-6 w-6" style={{color: '#6C63FF'}} />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalParticipants}</p>
                <p style={{color: '#6B7280'}}>Participants</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#FFF4E6'}}>
                <Camera className="h-6 w-6" style={{color: '#FF9F1C'}} />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalPosts}</p>
                <p style={{color: '#6B7280'}}>Photos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#ECFDF5'}}>
                <div className="text-lg" style={{color: '#22C55E'}}>❤️</div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalLikes}</p>
                <p style={{color: '#6B7280'}}>Likes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#FFF7ED'}}>
                <div className="text-lg" style={{color: '#FF9F1C'}}>💬</div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalComments}</p>
                <p style={{color: '#6B7280'}}>Comments</p>
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 PUT THE DEBUG SECTION HERE - RIGHT AFTER STATS, BEFORE TABS */}
        {/* ✅ TEMPORARY DEBUG SECTION - Remove after fixing */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <h3 className="font-bold text-yellow-800 mb-3">🧪 DEBUG: Event Prompts Structure</h3>
          <div className="text-sm space-y-2">
            <div><strong>Event ID:</strong> {event.id}</div>
            <div><strong>Prompts Array:</strong> {Array.isArray(event.prompts) ? 'YES' : 'NO'}</div>
            <div><strong>Prompts Count:</strong> {event.prompts?.length || 0}</div>
            
            {event.prompts && Array.isArray(event.prompts) && event.prompts.map((prompt, index) => (
              <div key={index} className="mt-3 p-3 bg-white border rounded">
                <div className="font-medium">Prompt {index + 1}: {prompt.question}</div>
                <div>Type: {prompt.type}</div>
                <div>Required: {prompt.required ? 'YES' : 'NO'}</div>
                <div>Has 'options' property: {'options' in prompt ? 'YES' : 'NO'}</div>
                <div>Options value: {JSON.stringify(prompt.options)}</div>
                <div>Options type: {typeof prompt.options}</div>
                <div>Options is array: {Array.isArray(prompt.options) ? 'YES' : 'NO'}</div>
                <div>Options length: {prompt.options?.length || 0}</div>
                
                {prompt.type === 'multipleChoice' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <strong>Multiple Choice Analysis:</strong>
                    {prompt.options && Array.isArray(prompt.options) ? (
                      <div>
                        ✅ Found {prompt.options.length} options:
                        <ul className="ml-4 mt-1">
                          {prompt.options.map((option, optIndex) => (
                            <li key={optIndex}>• {option}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-red-600">❌ No valid options array found</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'overview' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'overview' ? '#6C63FF' : '#6B7280'
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'qr'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'qr' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'qr' ? '#6C63FF' : '#6B7280'
                }}
              >
                QR Code & Sharing
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'settings' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'settings' ? '#6C63FF' : '#6B7280'
                }}
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
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Event Details</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-3" style={{color: '#6B7280'}}>
                        <MapPin className="h-5 w-5 mr-2" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center mb-3" style={{color: '#6B7280'}}>
                        <Calendar className="h-5 w-5 mr-2" />
                        <span>{new Date(event.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center" style={{color: '#6B7280'}}>
                        <Clock className="h-5 w-5 mr-2" />
                        <span>
                          {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2" style={{color: '#111827'}}>Description</h4>
                      <p style={{color: '#6B7280'}}>{event.description}</p>
                    </div>
                  </div>
                </div>

                {/* Interaction Prompts - COMPLETELY FIXED VERSION */}
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Interaction Prompts</h3>
                  <div className="space-y-3">
                    {event.prompts && Array.isArray(event.prompts) && event.prompts.length > 0 ? (
                      event.prompts.map((prompt, index) => (
                        <div key={prompt.id || index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium" style={{color: '#111827'}}>Question {index + 1}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                prompt.type === 'text' ? 'text-blue-800' : 'text-white'
                              }`} style={{
                                backgroundColor: prompt.type === 'text' ? '#DBEAFE' : '#22C55E'
                              }}>
                                {prompt.type === 'text' ? 'Short Text' : 'Multiple Choice'}
                              </span>
                              {prompt.required && (
                                <span className="px-2 py-1 text-xs rounded-full text-white" style={{backgroundColor: '#EF4444'}}>
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="mb-2" style={{color: '#374151'}}>{prompt.question}</p>
                          
                          {/* ✅ COMPLETELY FIXED: Options display with thorough debugging */}
                          {prompt.type === 'multipleChoice' && (
                            <div className="mt-3">
                              <p className="text-sm mb-2 font-medium" style={{color: '#6B7280'}}>Options:</p>
                              
                              {/* Debug info - remove after fixing */}
                              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                <strong>Debug:</strong> 
                                Options property exists: {'options' in prompt ? 'YES' : 'NO'} | 
                                Options value: {JSON.stringify(prompt.options)} | 
                                Is Array: {Array.isArray(prompt.options) ? 'YES' : 'NO'} | 
                                Length: {prompt.options?.length || 0}
                              </div>
                              
                              {/* ✅ FIXED: Remove the typo 'prompt.option' */}
                              {(() => {
                                // Only try to access the correct 'options' property
                                const options = prompt.options || [];
                                const optionsArray = getOptionsArray(prompt.options);
                                if (optionsArray.length > 0) {
                                  return (
                                    <ul className="list-disc list-inside text-sm space-y-1" style={{color: '#6B7280'}}>
                                      {optionsArray.map((option, optIndex) => (
                                        <li key={optIndex}>{option}</li>
                                      ))}
                                    </ul>
                                  );
                                } else {
                                  return (
                                    <div className="p-3 border border-orange-200 rounded-lg" style={{backgroundColor: '#FFF7ED'}}>
                                      <p className="text-sm" style={{color: '#EA580C'}}>
                                        ⚠️ No options found for this multiple choice question.
                                      </p>
                                      <p className="text-xs mt-1" style={{color: '#9CA3AF'}}>
                                        Raw data: {JSON.stringify(prompt)}
                                      </p>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-6 text-center">
                        <p style={{color: '#9CA3AF'}}>
                          No interaction prompts configured for this event.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>QR Code for Event Access</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center">
                        <QRCodeReact
                          value={eventUrl}
                          size={200}
                          style={{ margin: '0 auto' }}
                        />
                        <p className="text-sm mt-4" style={{color: '#6B7280'}}>
                          Attendees scan this QR code to join the event
                        </p>
                      </div>
                      <button
                        onClick={handleCopyQR}
                        className="w-full mt-4 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
                        style={{backgroundColor: '#6C63FF'}}
                      >
                        Download QR Code
                      </button>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3" style={{color: '#111827'}}>Event URL</h4>
                      <div className="rounded-lg p-4 mb-4" style={{backgroundColor: '#F9FAFB'}}>
                        <code className="text-sm break-all" style={{color: '#374151'}}>{eventUrl}</code>
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
                          className="flex-1 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center hover:opacity-90"
                          style={{backgroundColor: '#6C63FF'}}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Event
                        </a>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium mb-3" style={{color: '#111827'}}>How to Share</h4>
                        <ul className="text-sm space-y-2" style={{color: '#6B7280'}}>
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
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Event Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Event Status</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Control whether attendees can join the event</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.isActive ? 'text-white' : 'text-white'
                      }`} style={{
                        backgroundColor: event.isActive ? '#22C55E' : '#EF4444'
                      }}>
                        {event.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Visibility</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Who can find and join this event</p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#6C63FF'}}>
                        {event.visibility.charAt(0).toUpperCase() + event.visibility.slice(1)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Guest Posting</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Allow non-registered users to post photos</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium text-white`} style={{
                        backgroundColor: event.allowGuestPosting ? '#22C55E' : '#EF4444'
                      }}>
                        {event.allowGuestPosting ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Moderation</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Review posts before they appear publicly</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium`} style={{
                        backgroundColor: event.moderationEnabled ? '#FF9F1C' : '#22C55E',
                        color: 'white'
                      }}>
                        {event.moderationEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Danger Zone</h3>
                  <div className="border rounded-lg p-4" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
                    <h4 className="font-medium mb-2" style={{color: '#991B1B'}}>Delete Event</h4>
                    <p className="text-sm mb-4" style={{color: '#DC2626'}}>
                      Permanently delete this event and all associated data. This action cannot be undone.
                    </p>
                    <button 
                      className="text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
                      style={{backgroundColor: '#EF4444'}}
                    >
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