// src/lib/storage-test.ts
// Version: 1.0 - Firebase Storage connection test utility

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const testStorageConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Testing Firebase Storage connection...');
    
    // Create a small test file
    const testContent = new Blob(['Storage test'], { type: 'text/plain' });
    const testFile = new File([testContent], 'storage-test.txt', { type: 'text/plain' });
    
    // Create reference
    const testRef = ref(storage, `test/${Date.now()}-storage-test.txt`);
    console.log('📦 Test reference:', testRef.toString());
    
    // Upload test file
    console.log('⬆️ Uploading test file...');
    const snapshot = await uploadBytes(testRef, testFile);
    console.log('✅ Upload successful');
    
    // Get download URL
    console.log('🔗 Getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('✅ Download URL:', downloadURL);
    
    // Clean up test file
    console.log('🧹 Cleaning up test file...');
    await deleteObject(testRef);
    console.log('✅ Test file deleted');
    
    console.log('🎉 Storage test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('storage/unauthorized')) {
        console.error('🔒 Storage access denied - check Firebase Storage rules');
      } else if (error.message.includes('storage/bucket-not-found')) {
        console.error('🪣 Storage bucket not found - check Firebase configuration');
      } else if (error.message.includes('storage/project-not-found')) {
        console.error('🏗️ Firebase project not found - check project ID');
      }
    }
    
    return false;
  }
};

// Test function you can call from browser console
if (typeof window !== 'undefined') {
  (window as any).testStorage = testStorageConnection;
  console.log('🧪 Storage test available: Call testStorage() in console');
}