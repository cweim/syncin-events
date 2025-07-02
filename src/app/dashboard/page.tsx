// src/app/dashboard/page.tsx
// Version: 2.0 - Fixed form handling and navigation

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Camera, Plus, Calendar, MapPin, Users, QrCode, ArrowLeft } from 'lucide-react';
import { createEvent, generateUniqueEventUrl } from '@/lib/database';
import { CreateEventData } from '@/types';

interface EventFormData {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  prompts: Array<{ question: string; type: 'text' | 'multipleChoice'; required: boolean; options?: string[]; }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    prompts: [
      { question: "What's your name?", type: 'text', required: true },
      { question: "What brings you to this event?", type: 'text', required: false }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
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

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePromptChange = (index: number, field: string, value: string | boolean | string[]) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === index ? { ...prompt, [field]: value } : prompt
      )
    }));
  };

  const handlePromptTypeChange = (index: number, newType: 'text' | 'multipleChoice') => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === index 
          ? { 
              ...prompt, 
              type: newType,
              options: newType === 'multipleChoice' ? (prompt.options || ['Option 1', 'Option 2']) : undefined
            }
          : prompt
      )
    }));
  };

  const addPrompt = () => {
    setFormData(prev => ({
      ...prev,
      prompts: [...prev.prompts, { question: '', type: 'text', required: false }]
    }));
  };

  const removePrompt = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index)
    }));
  };

  const addOption = (promptIndex: number) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === promptIndex 
          ? { ...prompt, options: [...(prompt.options || []), ''] }
          : prompt
      )
    }));
  };

  const updateOption = (promptIndex: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      prompts: prev.prompts.map((prompt, i) => 
        i === promptIndex 
          ? { 
              ...prompt, 
              options: prompt.options?.map((opt, j) => j === optionIndex ? value : opt) || []
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
              options: prompt.options?.filter((_, j) => j !== optionIndex) || []
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
      
      // Generate unique URL for the event
      console.log('📝 Generating unique URL...');
      const eventUrl = await generateUniqueEventUrl(formData.title);
      console.log('✅ Generated event URL:', eventUrl);

      // Create event data
      const eventData: CreateEventData = {
        organizerId: 'temp-user-id', // TODO: Replace with actual auth user ID
        title: formData.title,
        description: formData.description,
        location: formData.location,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        eventUrl,
        prompts: formData.prompts.map((prompt, index) => ({
          id: `prompt_${index + 1}`,
          question: prompt.question,
          type: prompt.type,
          required: prompt.required,
          ...(prompt.type === 'multipleChoice' && prompt.options ? { options: prompt.options } : {}),
        })),
        isActive: true,
        requiresApproval: false,
        visibility: 'public',
        allowGuestPosting: true,
        moderationEnabled: true,
        status: 'live'
      };

      console.log('📋 Event data prepared:', eventData);

      // Create event in database
      console.log('💾 Creating event in database...');
      const eventId = await createEvent(eventData);
      
      console.log('🎉 Event created! Event ID:', eventId);
      console.log('🔍 Event ID type:', typeof eventId);
      console.log('📏 Event ID length:', eventId ? eventId.length : 'undefined');

      // Validate eventId before redirect
      if (!eventId || eventId.trim() === '') {
        throw new Error('Event ID is empty after creation');
      }

      setSubmitStatus('success');
      setCreatedEventId(eventId);

      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        prompts: [
          { question: "What's your name?", type: 'text', required: true },
          { question: "What brings you to this event?", type: 'text', required: false }
        ]
      });

      // Auto-redirect after 2 seconds
      const timer = setTimeout(() => {
        console.log('🔄 Auto-redirecting to:', `/dashboard/events/${eventId}`);
        router.push(`/dashboard/events/${eventId}`);
      }, 2000);
      setRedirectTimer(timer);

    } catch (error) {
      console.error('💥 Error creating event:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-6">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
              <Camera className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">SyncIn</span>
              <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-600 text-sm rounded-full">Organizer</span>
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
                <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
                <p className="text-gray-600 mt-2">Create and manage your photo-sharing events</p>
              </div>
              <button
                onClick={() => setIsCreating(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Event
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600">Active Events</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600">Total Participants</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Camera className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-gray-600">Photos Shared</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to start engaging with attendees</p>
              <button
                onClick={() => setIsCreating(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Create Your First Event
              </button>
            </div>
          </div>
        ) : (
          // Event Creation Form
          <div>
            <div className="flex items-center mb-8">
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            </div>

            {submitStatus === 'success' && createdEventId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <QrCode className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">🎉 Event created successfully!</h3>
                    <p className="text-sm text-green-600 mt-1">
                      Event ID: <span className="font-mono bg-green-100 px-2 py-1 rounded">{createdEventId}</span>
                    </p>
                    <p className="text-sm text-purple-600 mt-2 font-medium">
                      🔄 Redirecting to event dashboard in 2 seconds...
                    </p>
                    <div className="mt-3 space-x-2">
                      <Link
                        href={`/dashboard/events/${createdEventId}`}
                        className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error creating event</h3>
                    <p className="text-sm text-red-600 mt-1">Please try again later.</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
              {/* Event Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="Monthly Startup Pitch Night"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="TechHub Singapore"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Connect, pitch, and network with the startup community"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* Interaction Prompts */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Interaction Prompts (Optional)</h3>
                  <button
                    type="button"
                    onClick={addPrompt}
                    className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                  >
                    + Add Prompt
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  These questions help attendees create their profiles and break the ice
                </p>

                {formData.prompts.map((prompt, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-start mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Question {index + 1}
                      </label>
                      {formData.prompts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrompt(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="text"
                      value={prompt.question}
                      onChange={(e) => handlePromptChange(index, 'question', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-3 text-gray-900 placeholder-gray-400"
                      placeholder="What's your role at this event?"
                    />
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Response Type
                        </label>
                        <select
                          value={prompt.type}
                          onChange={(e) => handlePromptTypeChange(index, e.target.value as 'text' | 'multipleChoice')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Required</span>
                        </label>
                      </div>
                    </div>

                    {prompt.type === 'multipleChoice' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Answer Options
                        </label>
                        <div className="space-y-2">
                          {(prompt.options || []).map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center space-x-2">
                              <div className="flex-shrink-0">
                                <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                              </div>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              {(prompt.options?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addOption(index)}
                            className="flex items-center text-purple-600 hover:text-purple-700 text-sm font-medium mt-2"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
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
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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