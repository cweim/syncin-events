// src/app/auth/onboarding/page.tsx
// Version: 1.0 - Onboarding page with mandatory profile setup

'use client';

import { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Upload, User, Instagram, Linkedin, Facebook, ArrowRight } from 'lucide-react';
import { getCurrentFirebaseUser, updateUser } from '@/lib/auth';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    profilePhoto: null as File | null,
    instagram: '',
    linkedin: '',
    facebook: ''
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get redirect URL from query params
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  
  // Check if this is an event-related onboarding
  const isEventFlow = redirectUrl.includes('/event/');

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePhoto: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };


  const uploadProfilePhoto = async (file: File): Promise<string> => {
    const user = getCurrentFirebaseUser();
    if (!user) throw new Error('User not authenticated');

    const imageRef = ref(storage, `profile-photos/${user.uid}/${Date.now()}.jpg`);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 2) {
      setError('Username must be at least 2 characters long');
      return false;
    }
    if (!formData.profilePhoto) {
      setError('Profile photo is required');
      return false;
    }
    
    // Check if at least one social media is provided for event attendees
    if (isEventFlow) {
      const hasAnySocial = formData.instagram.trim() || formData.linkedin.trim() || formData.facebook.trim();
      if (!hasAnySocial) {
        setError('Please provide at least one social media handle to help others connect with you at the event');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const user = getCurrentFirebaseUser();
      if (!user) throw new Error('User not authenticated');

      // Upload profile photo
      let profilePhotoUrl = '';
      if (formData.profilePhoto) {
        profilePhotoUrl = await uploadProfilePhoto(formData.profilePhoto);
      }

      // Update user profile
      await updateUser(user.uid, {
        displayName: formData.username,
        profilePhotoUrl,
        // Add social profiles to user data
        socialProfiles: {
          instagram: formData.instagram.trim() ? formData.instagram.replace('@', '') : '',
          linkedin: formData.linkedin.trim() ? formData.linkedin.replace('@', '') : '',
          facebook: formData.facebook.trim() ? formData.facebook.replace('@', '') : ''
        }
      });

      // Redirect to intended destination
      if (isEventFlow) {
        // For event flows, redirect to the event prompts page
        router.push(redirectUrl);
      } else {
        // For non-event flows (organizers), redirect to dashboard
        router.push(redirectUrl);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete setup';
      setError(errorMessage);
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSocialHandle = (value: string) => {
    // Remove @ and any special characters, keep only alphanumeric and underscores
    return value.replace(/[^a-zA-Z0-9_.]/g, '');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-center">
            <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
            <span className="ml-2 text-lg font-bold" style={{color: '#111827'}}>SyncIn</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* Welcome Text */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{color: '#111827'}}>
                Complete your profile ✨
              </h1>
              <p style={{color: '#6B7280'}}>
                Help others recognize and connect with you at events
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg border" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
                <p className="text-sm" style={{color: '#DC2626'}}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Photo Section */}
              <div>
                <label className="block text-sm font-medium mb-3" style={{color: '#111827'}}>
                  Profile Photo *
                </label>
                
                {/* Photo Preview */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt="Profile preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-12 w-12" style={{color: '#9CA3AF'}} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Upload Option */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-5 w-5 mr-2" style={{color: '#6B7280'}} />
                    <span className="text-sm" style={{color: '#6B7280'}}>Upload Photo</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  style={{color: '#111827'}}
                  placeholder="Enter your username"
                  maxLength={30}
                />
                <p className="text-xs mt-1" style={{color: '#9CA3AF'}}>
                  This is how others will see you at events
                </p>
              </div>

              {/* Social Profiles */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{color: '#111827'}}>
                  Social Profiles {isEventFlow ? '*' : '(Optional)'}
                </h3>
                <p className="text-xs mb-4" style={{color: '#6B7280'}}>
                  {isEventFlow 
                    ? 'Please provide at least one social media handle to help others connect with you at the event'
                    : 'Help others connect with you outside events'
                  }
                </p>

                {/* Instagram */}
                <div className="mb-3">
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{color: '#E4405F'}} />
                    <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-sm" style={{color: '#6B7280'}}>@</span>
                    <input
                      type="text"
                      value={formData.instagram}
                      onChange={(e) => handleInputChange('instagram', formatSocialHandle(e.target.value))}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      style={{color: '#111827'}}
                      placeholder="instagram_handle"
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div className="mb-3">
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{color: '#0A66C2'}} />
                    <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-sm" style={{color: '#6B7280'}}>@</span>
                    <input
                      type="text"
                      value={formData.linkedin}
                      onChange={(e) => handleInputChange('linkedin', formatSocialHandle(e.target.value))}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      style={{color: '#111827'}}
                      placeholder="linkedin_handle"
                    />
                  </div>
                </div>

                {/* Facebook */}
                <div className="mb-3">
                  <div className="relative">
                    <Facebook className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{color: '#1877F2'}} />
                    <span className="absolute left-10 top-1/2 transform -translate-y-1/2 text-sm" style={{color: '#6B7280'}}>@</span>
                    <input
                      type="text"
                      value={formData.facebook}
                      onChange={(e) => handleInputChange('facebook', formatSocialHandle(e.target.value))}
                      className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      style={{color: '#111827'}}
                      placeholder="facebook_handle"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white py-4 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{backgroundColor: '#6C63FF'}}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Setting up your profile...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Required Fields Notice */}
            <div className="mt-6 text-center">
              <p className="text-xs" style={{color: '#9CA3AF'}}>
                * Required fields {isEventFlow && '• At least one social media handle is required for event attendees'}
                {!isEventFlow && '• Social profiles are optional and can be updated later'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OnboardingPageContent />
    </Suspense>
  );
}