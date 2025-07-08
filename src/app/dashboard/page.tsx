// src/app/dashboard/page.tsx
// Version: 4.1 - Removed back button and debug sections for better Admin UX

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Plus, Calendar, MapPin, Users, QrCode, Upload, X, ExternalLink } from 'lucide-react';
import { createEvent, generateUniqueEventUrl, getUserEvents } from '@/lib/database';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CreateEventData, Event } from '@/types';

interface EventFormData {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  coverPhoto: File | null;
  theme: 'light' | 'dark';
  prompts: Array<{ 
    question: string; 
    type: 'text' | 'multipleChoice'; 
    required: boolean; 
    options?: string[];
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    coverPhoto: null,
    theme: 'light',
    prompts: [
      { question: "What's your name?", type: 'text', required: true },
      { question: "What brings you to this event?", type: 'text', required: false }
    ]
  });
  
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [createdEventId, setCreatedEventId] = useState<string>('');
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  // Load user's events
  useEffect(() => {
    const loadUserEvents = async () => {
      try {
        setLoadingEvents(true);
        // TODO: Replace with actual auth user ID
        const events = await getUserEvents('temp-user-id');
        console.log('📋 Loaded user events:', events);
        setUserEvents(events);
      } catch (error) {
        console.error('Error loading user events:', error);
      } finally {
        setLoadingEvents(false);
      }
    };

    loadUserEvents();
  }, []);

  const refreshEvents = async () => {
    try {
      const events = await getUserEvents('temp-user-id');
      setUserEvents(events);
    } catch (error) {
      console.error('Error refreshing events:', error);
    }
  };

  // Date validation functions
  const validateDates = (startDate: string, endDate: string): string | null => {
    if (!startDate || !endDate) {
      return 'Both start and end dates are required';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Please enter valid dates';
    }

    // Check if start date is in the past (must be after current time)
    const now = new Date();
    if (start < now) {
      return 'Event start time must be in the future';
    }

    // Check if end date is before start date
    if (end < start) {
      return 'Event end date must be after start date';
    }

    // Allow same day events by checking if end is at least same time as start
    if (end.getTime() === start.getTime()) {
      return 'Event end time must be after start time';
    }

    return null; // No validation errors
  };

  const handleInputChange = (field: keyof EventFormData, value: string | File | null) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-validate dates when either date field changes
      if (field === 'startDate' || field === 'endDate') {
        const startDate = field === 'startDate' ? value as string : prev.startDate;
        const endDate = field === 'endDate' ? value as string : prev.endDate;
        
        // If both dates are filled, validate them
        if (startDate && endDate) {
          const dateError = validateDates(startDate, endDate);
          if (dateError) {
            setError(dateError);
          } else {
            setError(''); // Clear error if dates are valid
          }
        }
        
        // Auto-set minimum end date when start date changes
        if (field === 'startDate' && value && !endDate) {
          // Set end date to same day, 1 hour later
          const startDateTime = new Date(value as string);
          startDateTime.setHours(startDateTime.getHours() + 1);
          const defaultEndDate = startDateTime.toISOString().slice(0, 16);
          newData.endDate = defaultEndDate;
        }
      }
      
      return newData;
    });
    
    // Clear general errors when user makes changes (but keep date-specific errors)
    if (field !== 'startDate' && field !== 'endDate') {
      setError('');
    }
  };

  const handleCoverPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, coverPhoto: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCoverPhoto = () => {
    setFormData(prev => ({ ...prev, coverPhoto: null }));
    setCoverPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadCoverPhoto = async (file: File): Promise<string> => {
    try {
      console.log('📸 Starting cover photo upload...', file.name);
      const imageRef = ref(storage, `events/covers/${Date.now()}_${file.name}`);
      console.log('📦 Storage reference created:', imageRef.toString());
      
      const snapshot = await uploadBytes(imageRef, file);
      console.log('✅ Upload successful, getting download URL...');
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('🔗 Download URL generated:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('❌ Cover photo upload failed:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('storage/unauthorized')) {
          throw new Error('Storage access denied. Please check Firebase Storage rules.');
        } else if (error.message.includes('storage/canceled')) {
          throw new Error('Upload was canceled. Please try again.');
        } else if (error.message.includes('storage/quota-exceeded')) {
          throw new Error('Storage quota exceeded. Please contact support.');
        } else {
          throw new Error(`Upload failed: ${error.message}`);
        }
      }
      
      throw new Error('Failed to upload cover photo. Please try again.');
    }
  };

  const handlePromptChange = (index: number, field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === index ? { ...prompt, [field]: value } : prompt
      )
    }));
    setError(''); // Clear errors when user makes changes
  };

  const handlePromptTypeChange = (index: number, newType: 'text' | 'multipleChoice') => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === index 
          ? { 
              ...prompt, 
              type: newType,
              options: newType === 'multipleChoice' ? 
                (Array.isArray(prompt.options) && prompt.options.length > 0 ? prompt.options : ['Option 1', 'Option 2']) : 
                undefined
            }
          : prompt
      )
    }));
    console.log('🔄 Changed prompt type to:', newType, 'at index:', index);
  };

  const addPrompt = () => {
    setFormData(prev => ({
      ...prev,
      prompts: [...prev.prompts, { question: '', type: 'text', required: false }]
    }));
    setError(''); // Clear errors when user adds prompt
  };

  const removePrompt = (index: number) => {
    if (formData.prompts.length > 1) { // Keep at least one prompt
      setFormData(prev => ({
        ...prev,
        prompts: prev.prompts.filter((_, i) => i !== index)
      }));
    }
  };

  const addOption = (promptIndex: number) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === promptIndex 
          ? { 
              ...prompt, 
              options: Array.isArray(prompt.options) ? [...prompt.options, ''] : ['']
            }
          : prompt
      )
    }));
    console.log('➕ Added option to prompt', promptIndex);
  };

  const updateOption = (promptIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === promptIndex 
          ? { 
              ...prompt, 
              options: Array.isArray(prompt.options) ? 
                prompt.options.map((opt, j) => j === optionIndex ? value : opt) : 
                [value]
            }
          : prompt
      )
    }));
  };

  const removeOption = (promptIndex: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === promptIndex 
          ? { 
              ...prompt, 
              options: Array.isArray(prompt.options) ? 
                prompt.options.filter((_, j) => j !== optionIndex) : 
                []
            }
          : prompt
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      console.log('🚀 Starting event creation process...');
      
      // Validate dates first
      const dateError = validateDates(formData.startDate, formData.endDate);
      if (dateError) {
        setError(dateError);
        setIsSubmitting(false);
        return;
      }
      
      // Validate that we have at least one non-empty prompt
      const validPrompts = formData.prompts.filter(prompt => prompt.question.trim() !== '');
      console.log('📝 Valid prompts found:', validPrompts.length);
      
      if (validPrompts.length === 0) {
        setError('Please add at least one prompt question');
        setIsSubmitting(false);
        return;
      }
      
      // Generate unique URL for the event
      console.log('📝 Generating unique URL...');
      const eventUrl = await generateUniqueEventUrl(formData.title);
      console.log('✅ Generated event URL:', eventUrl);

      // Upload cover photo if provided
      let coverImageUrl: string | undefined;
      if (formData.coverPhoto) {
        try {
          console.log('📸 Uploading cover photo...');
          coverImageUrl = await uploadCoverPhoto(formData.coverPhoto);
          console.log('✅ Cover photo uploaded:', coverImageUrl);
        } catch (uploadError) {
          console.error('⚠️ Cover photo upload failed, continuing without image:', uploadError);
          // Continue without cover image instead of failing the entire event creation
          coverImageUrl = undefined;
        }
      } else {
        console.log('📸 No cover photo provided, skipping upload');
      }

      // Process prompts with proper options handling
      const processedPrompts = formData.prompts
        .filter(prompt => prompt.question.trim() !== '') // Remove empty prompts
        .map((prompt, index) => {
          const processedPrompt: any = {
            id: `prompt_${index + 1}`,
            question: prompt.question.trim(),
            type: prompt.type,
            required: prompt.required,
          };
          
          // Handle multiple choice options properly
          if (prompt.type === 'multipleChoice') {
            if (prompt.options && Array.isArray(prompt.options)) {
              const filteredOptions = prompt.options
                .filter(option => option && option.trim() !== '') // Remove empty options
                .map(option => option.trim()); // Trim whitespace
              
              if (filteredOptions.length > 0) {
                processedPrompt.options = filteredOptions;
              }
            }
          }
          
          return processedPrompt;
        });

      // Create event data
      const eventData: CreateEventData = {
        organizerId: 'temp-user-id', // TODO: Replace with actual auth user ID
        title: formData.title,
        description: formData.description,
        location: formData.location,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        coverImageUrl,
        eventUrl,
        prompts: processedPrompts,
        theme: formData.theme,
        isActive: true,
        requiresApproval: false,
        visibility: 'public',
        allowGuestPosting: true,
        moderationEnabled: true,
        status: 'live'
      };

      console.log('📋 Final event data:', eventData);

      // Create event in database
      console.log('💾 Creating event in database...');
      const eventId = await createEvent(eventData);
      
      console.log('🎉 Event created! Event ID:', eventId);

      // Validate eventId before redirect
      if (!eventId || eventId.trim() === '') {
        throw new Error('Event ID is empty after creation');
      }

      setSubmitStatus('success');
      setCreatedEventId(eventId);

      // Refresh events list
      await refreshEvents();

      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        coverPhoto: null,
        theme: 'light',
        prompts: [
          { question: "What's your name?", type: 'text', required: true },
          { question: "What brings you to this event?", type: 'text', required: false }
        ]
      });
      setCoverPhotoPreview('');

      // Auto-redirect after 2 seconds
      const timer = setTimeout(() => {
        console.log('🔄 Auto-redirecting to:', `/dashboard/events/${eventId}`);
        router.push(`/dashboard/events/${eventId}`);
      }, 2000);
      setRedirectTimer(timer);

    } catch (error) {
      console.error('💥 Error creating event:', error);
      setSubmitStatus('error');
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to create event. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-2xl font-bold" style={{color: '#111827'}}>SyncIn</span>
              <span className="ml-3 px-3 py-1 text-sm rounded-full text-white font-medium" style={{backgroundColor: '#FF9F1C'}}>Organizer</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isCreating ? (
          // Dashboard Overview
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold" style={{color: '#111827'}}>Your Event Studio</h1>
                <p className="mt-2" style={{color: '#6B7280'}}>Create social experiences that generate amazing content and lasting memories</p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="text-white px-6 py-3 rounded-lg transition-colors flex items-center font-medium hover:opacity-90"
                style={{backgroundColor: '#6C63FF'}}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Event
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#EDE9FE'}}>
                    <Calendar className="h-6 w-6" style={{color: '#6C63FF'}} />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold" style={{color: '#111827'}}>{userEvents.length}</p>
                    <p style={{color: '#6B7280'}}>Total Events</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#FFF4E6'}}>
                    <Users className="h-6 w-6" style={{color: '#FF9F1C'}} />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold" style={{color: '#111827'}}>
                      {userEvents.reduce((total, event) => total + event.stats.totalParticipants, 0)}
                    </p>
                    <p style={{color: '#6B7280'}}>Total Participants</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#ECFDF5'}}>
                    <Camera className="h-6 w-6" style={{color: '#22C55E'}} />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold" style={{color: '#111827'}}>
                      {userEvents.reduce((total, event) => total + event.stats.totalPosts, 0)}
                    </p>
                    <p style={{color: '#6B7280'}}>Photos Shared</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Events List */}
            {loadingEvents ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
                <p style={{color: '#6B7280'}}>Loading your events...</p>
              </div>
            ) : userEvents.length > 0 ? (
              <div>
                <h2 className="text-xl font-semibold mb-6" style={{color: '#111827'}}>Your Events</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Event Cover */}
                      <div className="h-32 bg-gradient-to-br from-indigo-400 to-purple-500 relative">
                        {event.coverImageUrl ? (
                          <img 
                            src={event.coverImageUrl} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="h-8 w-8 text-white opacity-50" />
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === 'live' ? 'bg-green-500 text-white' :
                            event.status === 'draft' ? 'bg-yellow-500 text-white' :
                            'bg-gray-500 text-white'
                          }`}>
                            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          </div>
                        </div>
                      </div>

                      <div className="p-4">
                        {/* Event Title & Date */}
                        <h3 className="font-bold text-lg mb-2" style={{color: '#111827'}}>
                          {event.title}
                        </h3>
                        
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center text-sm" style={{color: '#6B7280'}}>
                            <Calendar className="h-4 w-4 mr-2" />
                            {new Date(event.startDate).toLocaleDateString()}
                          </div>
                          <div className="flex items-center text-sm" style={{color: '#6B7280'}}>
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                          <div>
                            <div className="text-lg font-bold" style={{color: '#6C63FF'}}>
                              {event.stats.totalParticipants}
                            </div>
                            <div className="text-xs" style={{color: '#6B7280'}}>Participants</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold" style={{color: '#FF9F1C'}}>
                              {event.stats.totalPosts}
                            </div>
                            <div className="text-xs" style={{color: '#6B7280'}}>Photos</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold" style={{color: '#22C55E'}}>
                              {event.stats.totalLikes}
                            </div>
                            <div className="text-xs" style={{color: '#6B7280'}}>Likes</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                          <Link
                            href={`/dashboard/events/${event.id}`}
                            className="w-full text-white py-2 rounded-lg font-medium transition-colors hover:opacity-90 flex items-center justify-center"
                            style={{backgroundColor: '#6C63FF'}}
                          >
                            Manage Event
                          </Link>
                          <Link
                            href={`/event/${event.eventUrl}`}
                            target="_blank"
                            className="w-full border border-gray-300 py-2 rounded-lg font-medium transition-colors hover:bg-gray-50 flex items-center justify-center"
                            style={{color: '#6B7280'}}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Public Page
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Empty State
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4" style={{color: '#D1D5DB'}} />
                <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>Ready to create something amazing?</h3>
                <p className="mb-6 max-w-md mx-auto" style={{color: '#6B7280'}}>
                  Turn your next event into a social experience. Get attendees sharing photos, 
                  collect user-generated content, and create lasting memories — all with just a QR code.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="text-white px-6 py-3 rounded-lg transition-colors font-medium hover:opacity-90 flex items-center mx-auto"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Create Your First Event
                </button>
                <p className="mt-4 text-sm" style={{color: '#9CA3AF'}}>
                  Start free — no credit card required
                </p>
              </div>
            )}
          </div>
        ) : (
          // Event Creation Form
          <div>
            <div className="flex items-center mb-8">
              <h1 className="text-3xl font-bold" style={{color: '#111827'}}>Create New Event</h1>
            </div>

            {submitStatus === 'success' && createdEventId && (
              <div className="border rounded-lg p-4 mb-6" style={{backgroundColor: '#ECFDF5', borderColor: '#22C55E'}}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <QrCode className="h-5 w-5" style={{color: '#22C55E'}} />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium" style={{color: '#166534'}}>🎉 Event created successfully!</h3>
                    <p className="text-sm mt-1" style={{color: '#22C55E'}}>
                      Event ID: <span className="font-mono px-2 py-1 rounded" style={{backgroundColor: '#D1FAE5'}}>{createdEventId}</span>
                    </p>
                    <p className="text-sm mt-2 font-medium" style={{color: '#6C63FF'}}>
                      🔄 Redirecting to event dashboard in 2 seconds...
                    </p>
                    <div className="mt-3 space-x-2">
                      <Link
                        href={`/dashboard/events/${createdEventId}`}
                        className="inline-block text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium hover:opacity-90"
                        style={{backgroundColor: '#22C55E'}}
                      >
                        Go Now →
                      </Link>
                      <button
                        onClick={() => {
                          if (redirectTimer) {
                            clearTimeout(redirectTimer);
                            setRedirectTimer(null);
                          }
                          setSubmitStatus('idle');
                        }}
                        className="inline-block bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                      >
                        Cancel & Stay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="border rounded-lg p-4 mb-6" style={{backgroundColor: '#FEF2F2', borderColor: '#EF4444'}}>
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium" style={{color: '#991B1B'}}>Error creating event</h3>
                    <p className="text-sm mt-1" style={{color: '#EF4444'}}>
                      {error || 'Please try again later.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
              {/* Event Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                    placeholder="Monthly Startup Pitch Night"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                    placeholder="TechHub Singapore"
                  />
                </div>
              </div>

              {/* Theme Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3" style={{color: '#111827'}}>
                  Event Theme
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                      formData.theme === 'light' 
                        ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleInputChange('theme', 'light')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-white border border-gray-300 rounded shadow-sm flex items-center justify-center">
                        <div className="w-6 h-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded"></div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Light Theme</h3>
                        <p className="text-xs text-gray-500">Clean and bright interface</p>
                      </div>
                    </div>
                    {formData.theme === 'light' && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  <div 
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
                      formData.theme === 'dark' 
                        ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleInputChange('theme', 'dark')}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-gray-900 border border-gray-700 rounded shadow-sm flex items-center justify-center">
                        <div className="w-6 h-4 bg-gradient-to-br from-gray-700 to-gray-800 rounded"></div>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Dark Theme</h3>
                        <p className="text-xs text-gray-500">Sleek and modern interface</p>
                      </div>
                    </div>
                    {formData.theme === 'dark' && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  style={{color: '#111827'}}
                  placeholder="Connect, pitch, and network with the startup community"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    min={new Date().toISOString().slice(0, 16)} // Prevent past dates
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    min={formData.startDate || new Date().toISOString().slice(0, 16)} // Dynamic min based on start date
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                  />
                  {formData.startDate && formData.endDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Duration: {(() => {
                        const start = new Date(formData.startDate);
                        const end = new Date(formData.endDate);
                        const diffMs = end.getTime() - start.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffHours / 24);
                        const remainingHours = diffHours % 24;
                        
                        if (diffDays > 0) {
                          return remainingHours > 0 
                            ? `${diffDays} day${diffDays > 1 ? 's' : ''} and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
                            : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                        } else {
                          return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
                        }
                      })()}
                    </p>
                  )}
                </div>
              </div>

              {/* Cover Photo Upload */}
              <div className="mb-8">
                <label className="block text-sm font-medium mb-3" style={{color: '#111827'}}>
                  Event Cover Photo (Optional)
                </label>
                <p className="text-sm mb-4" style={{color: '#6B7280'}}>
                  Add a cover photo to make your event more appealing to attendees
                </p>

                {/* Photo Preview */}
                {coverPhotoPreview ? (
                  <div className="relative mb-4">
                    <img
                      src={coverPhotoPreview}
                      alt="Cover photo preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={removeCoverPhoto}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                    <Upload className="h-12 w-12 mx-auto mb-4" style={{color: '#9CA3AF'}} />
                    <p className="text-sm mb-2" style={{color: '#6B7280'}}>
                      Drag and drop an image here, or click to browse
                    </p>
                    <p className="text-xs" style={{color: '#9CA3AF'}}>
                      Recommended: 1280x720px, JPG or PNG, max 5MB
                    </p>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 flex items-center"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {coverPhotoPreview ? 'Change Photo' : 'Upload Cover Photo'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverPhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Interaction Prompts */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium" style={{color: '#111827'}}>Interaction Prompts (Optional)</h3>
                  <button
                    type="button"
                    onClick={addPrompt}
                    className="text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{color: '#6C63FF'}}
                  >
                    + Add Prompt
                  </button>
                </div>
                <p className="text-sm mb-4" style={{color: '#6B7280'}}>
                  These questions help attendees create their profiles and break the ice
                </p>

                {formData.prompts.map((prompt, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <label className="block text-sm font-medium" style={{color: '#111827'}}>
                        Question {index + 1}
                      </label>
                      {formData.prompts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrompt(index)}
                          className="text-sm hover:opacity-80 transition-opacity"
                          style={{color: '#EF4444'}}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      value={prompt.question}
                      onChange={(e) => handlePromptChange(index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3"
                      style={{color: '#111827'}}
                      placeholder="What's your role at this event?"
                    />
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{color: '#111827'}}>
                          Response Type
                        </label>
                        <select
                          value={prompt.type}
                          onChange={(e) => handlePromptTypeChange(index, e.target.value as 'text' | 'multipleChoice')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          style={{color: '#111827'}}
                        >
                          <option value="text">Short Text</option>
                          <option value="multipleChoice">Multiple Choice</option>
                        </select>
                      </div>
                      
                      <div className="flex items-end">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={prompt.required}
                            onChange={(e) => handlePromptChange(index, 'required', e.target.checked)}
                            className="rounded border-gray-300"
                            style={{accentColor: '#6C63FF'}}
                          />
                          <span className="ml-2 text-sm" style={{color: '#111827'}}>Required</span>
                        </label>
                      </div>
                    </div>

                    {prompt.type === 'multipleChoice' && (
                      <div>
                        <label className="block text-sm font-medium mb-3" style={{color: '#111827'}}>
                          Answer Options
                        </label>
                        <div className="space-y-2">
                          {(Array.isArray(prompt.options) ? prompt.options : []).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <div className="flex-shrink-0">
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                              </div>
                              <input
                                type="text"
                                value={option || ''}
                                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                style={{color: '#111827'}}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              {((prompt.options && Array.isArray(prompt.options) ? prompt.options.length : 0) > 1) && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => addOption(index)}
                            className="flex items-center text-sm font-medium mt-2 hover:opacity-80 transition-opacity"
                            style={{color: '#6C63FF'}}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add option
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{color: '#6B7280'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium hover:opacity-90 disabled:hover:opacity-50"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Event...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}