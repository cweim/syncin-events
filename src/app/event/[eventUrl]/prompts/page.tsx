// src/app/event/[eventUrl]/prompts/page.tsx
// Version: 1.4 - Removed debug sections and added multiple choice selection support

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { getEventByUrl, createEventParticipant, getParticipantByUser } from '@/lib/database';
import { getCurrentFirebaseUser, addEventToUserHistory } from '@/lib/auth';
import { Event, CreateParticipantData, PromptResponse } from '@/types';
import { getThemeStyles, getThemeInlineStyles, getCardStyles } from '@/lib/theme-utils';

interface PageProps {
  params: Promise<{ eventUrl: string }>;
}

export default function EventPromptsPage({ params }: PageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventUrl, setEventUrl] = useState<string>('');
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

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
      // Redirect to sign in with return URL
      router.push(`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!eventUrl || !currentUser) return;

    const loadEvent = async () => {
      try {
        const eventData = await getEventByUrl(eventUrl);
        if (!eventData) {
          setError('Event not found or no longer active');
          return;
        }

        if (!eventData.isActive) {
          setError('This event is no longer accepting participants');
          return;
        }

        // Check if user is already a participant
        const existingParticipant = await getParticipantByUser(eventData.id, currentUser.uid);
        if (existingParticipant) {
          // User already joined, redirect to feed page
          router.push(`/event/${eventUrl}/feed`);
          return;
        }

        setEvent(eventData);
        
        // Initialize responses object with proper prompts validation
        const initialResponses: Record<string, string | string[]> = {};
        
        // Ensure prompts is an array before processing
        const prompts = Array.isArray(eventData.prompts) ? eventData.prompts : [];
        console.log('📝 Processing prompts:', prompts);
        
        prompts.forEach(prompt => {
          if (prompt && prompt.id) {
            // Initialize as empty array for multiple choice, empty string for text
            initialResponses[prompt.id] = prompt.type === 'multipleChoice' ? [] : '';
          }
        });
        
        setResponses(initialResponses);
        
      } catch (error) {
        console.error('💥 Error loading event:', error);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventUrl, currentUser, router]);

  const handleResponseChange = (promptId: string, value: string | string[]) => {
    setResponses(prev => ({ ...prev, [promptId]: value }));
    setError(''); // Clear error when user types
  };

  const handleMultipleChoiceChange = (promptId: string, option: string, checked: boolean) => {
    setResponses(prev => {
      const currentResponses = Array.isArray(prev[promptId]) ? prev[promptId] as string[] : [];
      
      if (checked) {
        // Add option if not already present
        if (!currentResponses.includes(option)) {
          return { ...prev, [promptId]: [...currentResponses, option] };
        }
      } else {
        // Remove option
        return { ...prev, [promptId]: currentResponses.filter(item => item !== option) };
      }
      
      return prev;
    });
    setError(''); // Clear error when user makes changes
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

  const validateResponses = () => {
    if (!event) return false;

    // Ensure prompts is an array
    const prompts = Array.isArray(event.prompts) ? event.prompts : [];
    
    for (const prompt of prompts) {
      if (prompt && prompt.required) {
        const response = responses[prompt.id];
        
        if (prompt.type === 'multipleChoice') {
          // For multiple choice, check if at least one option is selected
          if (!Array.isArray(response) || response.length === 0) {
            setError(`Please select at least one option for: ${prompt.question}`);
            return false;
          }
        } else {
          // For text, check if response is not empty
          if (!response || (typeof response === 'string' && response.trim() === '')) {
            setError(`Please answer: ${prompt.question}`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateResponses() || !event || !currentUser) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Convert responses to the format expected by the database (PromptResponse[])
      const processedResponses: PromptResponse[] = [];
      
      // Get the prompts to access the question text
      const prompts = Array.isArray(event.prompts) ? event.prompts : [];
      
      Object.entries(responses).forEach(([promptId, response]) => {
        const prompt = prompts.find(p => p.id === promptId);
        if (prompt) {
          let answerText: string;
          if (Array.isArray(response)) {
            // For multiple choice, join selected options with commas
            answerText = response.join(', ');
          } else {
            // For text responses, use as is
            answerText = response;
          }
          
          if (answerText.trim()) {
            processedResponses.push({
              question: prompt.question,
              answer: answerText
            });
          }
        }
      });

      // Create event participant
      const participantData: CreateParticipantData = {
        eventId: event.id,
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous User',
        ...(currentUser.photoURL ? { profilePhotoUrl: currentUser.photoURL } : {}),
        promptResponses: processedResponses,
        hasPosted: false,
        isApproved: !event.requiresApproval,
        isModerator: false,
      };

      console.log('👤 Creating participant with data:', participantData);
      const participantId = await createEventParticipant(participantData);
      console.log('✅ Created participant:', participantId);

      // Add event to user's history
      await addEventToUserHistory(currentUser.uid, event.id);

      // Redirect to feed page
      router.push(`/event/${eventUrl}/feed`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join event';
      setError(errorMessage);
      console.error('Error joining event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    // Use default light theme for loading since event theme isn't loaded yet
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p className="text-gray-600">Loading event prompts...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    // Use default light theme for error since event theme might not be loaded
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Unable to Load Event</h1>
          <p className="mb-6 text-gray-600">{error}</p>
          <div className="space-y-3">
            <Link
              href={`/event/${eventUrl}`}
              className="inline-block text-white px-6 py-2 rounded-lg transition-colors hover:opacity-90"
              style={{backgroundColor: '#6C63FF'}}
            >
              Back to Event
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const requiredPromptsCount = Array.isArray(event.prompts) ? event.prompts.filter(p => p && p.required).length : 0;
  const answeredRequiredCount = Array.isArray(event.prompts) ? event.prompts.filter(p => {
    if (!p || !p.required) return false;
    const response = responses[p.id];
    if (p.type === 'multipleChoice') {
      return Array.isArray(response) && response.length > 0;
    } else {
      return response && typeof response === 'string' && response.trim() !== '';
    }
  }).length : 0;

  const themeStyles = getThemeStyles(event.theme);
  const themeInlineStyles = getThemeInlineStyles(event.theme);

  return (
    <div className={`min-h-screen flex flex-col ${themeStyles.background}`} style={themeInlineStyles}>
      {/* Header */}
      <header className={`${themeStyles.cardBackground} shadow-sm`}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/event/${eventUrl}`} className={`flex items-center ${themeStyles.textSecondary}`}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to Event</span>
            </Link>
            <div className="flex items-center">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className={`ml-2 text-lg font-bold ${themeStyles.textPrimary}`}>SyncIn</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className={`${getCardStyles(event.theme)} rounded-xl shadow-sm p-8`}>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className={`text-2xl font-bold mb-2 ${themeStyles.textPrimary}`}>
                Almost there! 🎉
              </h1>
              <p className={themeStyles.textSecondary}>
                Help others get to know you by answering a few questions about{' '}
                <span className={`font-semibold ${themeStyles.textPrimary}`}>{event.title}</span>
              </p>
              
              {/* Progress */}
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className={`text-sm ${themeStyles.textMuted}`}>
                  {answeredRequiredCount} of {requiredPromptsCount} required questions completed
                </div>
                {requiredPromptsCount > 0 && (
                  <div className={`w-32 rounded-full h-2 ${event.theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: '#6C63FF',
                        width: `${(answeredRequiredCount / requiredPromptsCount) * 100}%`
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`mb-6 p-4 rounded-lg border ${event.theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm ${themeStyles.error}`}>{error}</p>
              </div>
            )}

            {/* Questions Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {Array.isArray(event.prompts) && event.prompts.length > 0 ? (
                event.prompts.map((prompt, index) => (
                  prompt ? (
                    <div key={prompt.id || index} className={`${themeStyles.border} border rounded-lg p-6`}>
                      <div className="flex items-start justify-between mb-4">
                        <h3 className={`text-lg font-medium pr-4 ${themeStyles.textPrimary}`}>
                          {prompt.question}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            prompt.type === 'text' ? 'text-blue-800' : 'text-white'
                          }`} style={{
                            backgroundColor: prompt.type === 'text' ? '#DBEAFE' : '#22C55E'
                          }}>
                            {prompt.type === 'text' ? 'Text' : 'Multiple Choice'}
                          </span>
                          {prompt.required && (
                            <span className="px-2 py-1 text-xs rounded-full text-white font-medium" style={{backgroundColor: '#EF4444'}}>
                              Required
                            </span>
                          )}
                        </div>
                      </div>

                      {prompt.type === 'text' ? (
                        <textarea
                          value={(responses[prompt.id] as string) || ''}
                          onChange={(e) => handleResponseChange(prompt.id, e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${themeStyles.inputBackground} ${themeStyles.inputBorder} ${themeStyles.textPrimary}`}
                          placeholder="Type your answer here..."
                          rows={3}
                          maxLength={500}
                        />
                      ) : (
                        <div className="space-y-3">
                          <p className={`text-sm ${themeStyles.textSecondary}`}>
                            Select one or more options:
                          </p>
                          
                          {(() => {
                            const optionsArray = getOptionsArray(prompt.options);
                            const selectedOptions = Array.isArray(responses[prompt.id]) ? responses[prompt.id] as string[] : [];
                            
                            if (optionsArray.length > 0) {
                              return optionsArray.map((option, optionIndex) => (
                                <label key={optionIndex} className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedOptions.includes(option)}
                                    onChange={(e) => handleMultipleChoiceChange(prompt.id, option, e.target.checked)}
                                    className="mr-3"
                                    style={{accentColor: '#6C63FF'}}
                                  />
                                  <span className={themeStyles.textPrimary}>{option}</span>
                                </label>
                              ));
                            } else {
                              return (
                                <div className={`p-4 border rounded-lg ${event.theme === 'dark' ? 'border-orange-800 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
                                  <p className={`text-sm ${themeStyles.warning}`}>
                                    ⚠️ No options available for this question.
                                  </p>
                                </div>
                              );
                            }
                          })()}
                          
                          {/* Show selected options count */}
                          {(() => {
                            const selectedOptions = Array.isArray(responses[prompt.id]) ? responses[prompt.id] as string[] : [];
                            if (selectedOptions.length > 0) {
                              return (
                                <div className={`mt-2 text-sm ${themeStyles.textMuted}`}>
                                  {selectedOptions.length} option{selectedOptions.length !== 1 ? 's' : ''} selected
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}

                      {/* Character count for text inputs */}
                      {prompt.type === 'text' && responses[prompt.id] && typeof responses[prompt.id] === 'string' && (
                        <div className={`mt-2 text-xs text-right ${themeStyles.textMuted}`}>
                          {(responses[prompt.id] as string).length}/500
                        </div>
                      )}

                      {/* Completion indicator */}
                      {(() => {
                        const response = responses[prompt.id];
                        const isCompleted = prompt.type === 'multipleChoice' 
                          ? Array.isArray(response) && response.length > 0
                          : response && typeof response === 'string' && response.trim() !== '';
                        
                        if (isCompleted) {
                          return (
                            <div className={`mt-3 flex items-center text-sm ${themeStyles.success}`}>
                              <Check className="h-4 w-4 mr-1" />
                              <span>Complete</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : null
                ))
              ) : (
                <div className={`${themeStyles.border} border rounded-lg p-6 text-center`}>
                  <p className={themeStyles.textMuted}>No prompts configured for this event. You can join directly!</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${themeStyles.buttonPrimary}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Joining event...
                    </>
                  ) : (
                    <>
                      Join Event & Start Sharing
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>

                {/* Help text */}
                <div className="mt-4 text-center">
                  <p className={`text-sm ${themeStyles.textMuted}`}>
                    Your answers help other attendees get to know you and break the ice!
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}