// src/lib/status-check.ts
// Version: 1.0 - Quick status verification for SyncIn app

import { getUserEvents, getEvent } from './database';
import { getCurrentFirebaseUser } from './auth';

export const checkAppStatus = async () => {
  console.log('🔍 SyncIn Status Check Starting...');
  console.log('================================');
  
  const status = {
    auth: false,
    database: false,
    index: false,
    prompts: false,
    overall: false
  };
  
  try {
    // 1. Check Authentication
    console.log('👤 Checking Authentication...');
    const user = getCurrentFirebaseUser();
    if (user) {
      console.log('✅ User authenticated:', user.email);
      status.auth = true;
    } else {
      console.log('❌ No user authenticated');
    }
    
    // 2. Check Database Connection
    console.log('\n📊 Checking Database...');
    try {
      // Test with temp user ID (same as used in dashboard)
      const events = await getUserEvents('temp-user-id');
      console.log(`✅ Database connection OK - Found ${events.length} events`);
      status.database = true;
      status.index = true; // If this succeeds, index is working
      
      // 3. Check Prompts for existing events
      if (events.length > 0) {
        console.log('\n📝 Checking Prompts...');
        const testEvent = events[0];
        
        const fullEvent = await getEvent(testEvent.id);
        if (fullEvent) {
          console.log('Event prompts analysis:');
          console.log('  - Prompts field type:', typeof fullEvent.prompts);
          console.log('  - Is array:', Array.isArray(fullEvent.prompts));
          console.log('  - Count:', fullEvent.prompts?.length || 0);
          
          if (Array.isArray(fullEvent.prompts)) {
            console.log('✅ Prompts working correctly');
            status.prompts = true;
          } else {
            console.log('❌ Prompts corrupted (not array)');
          }
        }
      } else {
        console.log('⚠️ No events found to test prompts');
        status.prompts = true; // Assume OK if no events
      }
      
    } catch (error) {
      console.log('❌ Database error:', error);
      
      if (error instanceof Error && error.message.includes('index')) {
        console.log('🔥 FIREBASE INDEX MISSING!');
        console.log('Create index: organizerId (Ascending), createdAt (Descending)');
        status.index = false;
      }
    }
    
    // 4. Overall Status
    status.overall = status.auth && status.database && status.index && status.prompts;
    
    console.log('\n📋 FINAL STATUS REPORT');
    console.log('================================');
    console.log('Authentication:', status.auth ? '✅ Working' : '❌ Failed');
    console.log('Database:', status.database ? '✅ Working' : '❌ Failed');
    console.log('Firebase Index:', status.index ? '✅ Working' : '❌ Missing');
    console.log('Prompts Arrays:', status.prompts ? '✅ Working' : '❌ Corrupted');
    console.log('Overall Status:', status.overall ? '🎉 ALL GOOD!' : '⚠️ NEEDS ATTENTION');
    
    if (!status.overall) {
      console.log('\n🛠️ NEXT STEPS:');
      if (!status.index) {
        console.log('1. Create Firebase composite index');
        console.log('   Link: https://console.firebase.google.com/v1/r/project/syncin-event/firestore/indexes');
      }
      if (!status.prompts) {
        console.log('2. Test prompts with a new event creation');
      }
      if (!status.auth) {
        console.log('3. Test authentication flow');
      }
    }
    
    return status;
    
  } catch (error) {
    console.error('💥 Status check failed:', error);
    return status;
  }
};

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).checkStatus = checkAppStatus;
  console.log('🛠️ Run checkStatus() in console for full status report');
}