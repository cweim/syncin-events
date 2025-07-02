// src/lib/debug-prompts.ts
// Version: 1.0 - Debug script for prompts array handling

import { getEvent, createEvent } from './database';
import { CreateEventData } from '@/types';

// Test prompts data structure
const testPrompts = [
  {
    id: 'prompt_1',
    question: "What's your name?",
    type: 'text' as const,
    required: true
  },
  {
    id: 'prompt_2', 
    question: "What brings you to this event?",
    type: 'text' as const,
    required: false
  },
  {
    id: 'prompt_3',
    question: "What's your role?",
    type: 'multipleChoice' as const,
    required: true,
    options: ['Developer', 'Designer', 'Manager', 'Other']
  }
];

export const debugPromptsFlow = async () => {
  console.log('🧪 Starting prompts debugging...');
  
  try {
    // 1. Test event creation with prompts
    console.log('📝 Creating test event with prompts...');
    console.log('Input prompts:', JSON.stringify(testPrompts, null, 2));
    
    const testEventData: CreateEventData = {
      organizerId: 'debug-test-user',
      title: `Debug Test Event ${Date.now()}`,
      description: 'Testing prompts array handling',
      location: 'Debug Location',
      startDate: new Date(),
      endDate: new Date(Date.now() + 3600000), // 1 hour later
      eventUrl: `debug-test-${Date.now()}`,
      prompts: testPrompts,
      isActive: true,
      requiresApproval: false,
      visibility: 'public',
      allowGuestPosting: true,
      moderationEnabled: false,
      status: 'live'
    };
    
    const eventId = await createEvent(testEventData);
    console.log('✅ Event created with ID:', eventId);
    
    // 2. Test event retrieval
    console.log('📖 Retrieving event to test prompts...');
    const retrievedEvent = await getEvent(eventId);
    
    if (retrievedEvent) {
      console.log('✅ Event retrieved successfully');
      console.log('📋 Retrieved prompts:', JSON.stringify(retrievedEvent.prompts, null, 2));
      console.log('📊 Prompts analysis:');
      console.log('  - Is prompts an array?', Array.isArray(retrievedEvent.prompts));
      console.log('  - Prompts count:', retrievedEvent.prompts?.length || 0);
      console.log('  - Prompts type:', typeof retrievedEvent.prompts);
      
      // 3. Validate each prompt structure
      if (Array.isArray(retrievedEvent.prompts)) {
        retrievedEvent.prompts.forEach((prompt, index) => {
          console.log(`  - Prompt ${index + 1}:`, {
            id: prompt.id,
            question: prompt.question?.substring(0, 30) + '...',
            type: prompt.type,
            required: prompt.required,
            hasOptions: prompt.type === 'multipleChoice' ? Array.isArray(prompt.options) : 'N/A'
          });
        });
        
        return {
          success: true,
          eventId,
          promptsCount: retrievedEvent.prompts.length,
          promptsValid: retrievedEvent.prompts.every(p => p.id && p.question && p.type)
        };
      } else {
        console.error('❌ Prompts is not an array!');
        console.error('Actual prompts type:', typeof retrievedEvent.prompts);
        console.error('Actual prompts value:', retrievedEvent.prompts);
        
        return {
          success: false,
          error: 'Prompts array corrupted',
          actualType: typeof retrievedEvent.prompts,
          actualValue: retrievedEvent.prompts
        };
      }
    } else {
      console.error('❌ Failed to retrieve event');
      return {
        success: false,
        error: 'Event not found after creation'
      };
    }
    
  } catch (error) {
    console.error('💥 Debug test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Quick prompts validation for existing events
export const validateExistingEventPrompts = async (eventId: string) => {
  console.log(`🔍 Validating prompts for event: ${eventId}`);
  
  try {
    const event = await getEvent(eventId);
    if (!event) {
      console.error('❌ Event not found');
      return false;
    }
    
    console.log('📋 Event prompts analysis:');
    console.log('  - Prompts field exists:', 'prompts' in event);
    console.log('  - Prompts is array:', Array.isArray(event.prompts));
    console.log('  - Prompts count:', event.prompts?.length || 0);
    console.log('  - Raw prompts:', event.prompts);
    
    return Array.isArray(event.prompts) && event.prompts.length > 0;
  } catch (error) {
    console.error('💥 Validation failed:', error);
    return false;
  }
};

// Helper to run debug in browser console
if (typeof window !== 'undefined') {
  (window as any).debugPrompts = debugPromptsFlow;
  (window as any).validatePrompts = validateExistingEventPrompts;
  console.log('🛠️ Debug functions available: debugPrompts(), validatePrompts(eventId)');
}