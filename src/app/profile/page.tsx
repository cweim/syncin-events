// src/app/profile/page.tsx
// Version: 1.0 - Profile editing page for user account management

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Camera, 
  Upload, 
  User, 
  Instagram, 
  Linkedin, 
  Facebook, 
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { getCurrentFirebaseUser, updateUser, signOutUser } from '@/lib/auth';
import { getUser } from '@/lib/database';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User as UserType } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    profilePhoto: null as File | null,
    instagram: '',
    linkedin: '',
    facebook: ''
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string>('');

  useEffect(() => {
    // Check authentication
    const user = getCurrentFirebaseUser();
    if (!user) {
      router.push('/auth/signin?redirect=/profile');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    const loadUserData = async () => {
      try {
        const user = await getUser(currentUser.uid);
        if (!user) {
          setError('User profile not found');
          return;
        }
        
        setUserData(user);
        setFormData({
          displayName: user.displayName || '',
          profilePhoto: null,
          instagram: user.socialProfiles?.instagram || '',
          linkedin: user.socialProfiles?.linkedin || '',
          facebook: user.socialProfiles?.facebook || ''
        });
        
        if (user.profilePhotoUrl) {
          setProfilePhotoPreview(user.profilePhotoUrl);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccessMessage('');
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
    if (!currentUser) throw new Error('User not authenticated');

    // Delete old photo if exists
    if (userData?.profilePhotoUrl) {
      try {
        const oldPhotoRef = ref(storage, userData.profilePhotoUrl);
        await deleteObject(oldPhotoRef);
      } catch (error) {
        console.log('Old photo deletion failed (may not exist):', error);
      }
    }

    const imageRef = ref(storage, `profile-photos/${currentUser.uid}/${Date.now()}.jpg`);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };


  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return false;
    }
    if (formData.displayName.length < 2) {
      setError('Display name must be at least 2 characters long');
      return false;
    }
    
    // Check if at least one social media is provided for attendees
    if (userData?.role === 'attendee' || userData?.role === 'both') {
      const hasAnySocial = formData.instagram.trim() || formData.linkedin.trim() || formData.facebook.trim();
      if (!hasAnySocial) {
        setError('Please provide at least one social media handle to help others connect with you at events');
        return false;
      }
    }
    
    return true;
  };

  const formatSocialHandle = (value: string) => {
    return value.replace(/[^a-zA-Z0-9_.]/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !currentUser) return;

    setIsSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Upload new profile photo if provided
      let profilePhotoUrl = userData?.profilePhotoUrl;
      if (formData.profilePhoto) {
        profilePhotoUrl = await uploadProfilePhoto(formData.profilePhoto);
      }

      // Update user profile
      await updateUser(currentUser.uid, {
        displayName: formData.displayName,
        profilePhotoUrl: profilePhotoUrl || undefined,
        socialProfiles: {
          instagram: formData.instagram.trim() ? formData.instagram.replace('@', '') : '',
          linkedin: formData.linkedin.trim() ? formData.linkedin.replace('@', '') : '',
          facebook: formData.facebook.trim() ? formData.facebook.replace('@', '') : ''
        }
      });

      // Refresh user data
      const updatedUser = await getUser(currentUser.uid);
      setUserData(updatedUser);

      // Reset form
      setFormData(prev => ({ ...prev, profilePhoto: null }));
      
      setSuccessMessage('Profile updated successfully!');
      
      // Auto-redirect to my-events page after short delay
      setTimeout(() => {
        router.push('/my-events');
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      setError(errorMessage);
      console.error('Profile update error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/my-events" className="flex items-center" style={{color: '#6B7280'}}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to My Events</span>
            </Link>
            <div className="flex items-center">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-lg font-bold" style={{color: '#111827'}}>SyncIn</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2" style={{color: '#111827'}}>
                Edit Your Profile
              </h1>
              <p style={{color: '#6B7280'}}>
                Update your information and social profiles
              </p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-lg border" style={{backgroundColor: '#ECFDF5', borderColor: '#22C55E'}}>
                <p className="text-sm" style={{color: '#166534'}}>{successMessage}</p>
              </div>
            )}

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
                  Profile Photo
                </label>
                
                {/* Photo Preview */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    {profilePhotoPreview ? (
                      <img
                        src={profilePhotoPreview}
                        alt="Profile preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-16 w-16" style={{color: '#9CA3AF'}} />
                      </div>
                    )}
                    
                  </div>
                </div>

  
                {/* Photo Upload Options */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="h-5 w-5 mr-2" style={{color: '#6B7280'}} />
                    <span className="text-sm" style={{color: '#6B7280'}}>Take Photo</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-5 w-5 mr-2" style={{color: '#6B7280'}} />
                    <span className="text-sm" style={{color: '#6B7280'}}>Upload</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  style={{color: '#111827'}}
                  placeholder="Enter your display name"
                  maxLength={30}
                />
                <p className="text-xs mt-1" style={{color: '#9CA3AF'}}>
                  This is how others will see you at events
                </p>
              </div>

              {/* Social Profiles */}
              <div>
                <h3 className="text-sm font-medium mb-3" style={{color: '#111827'}}>
                  Social Profiles {(userData?.role === 'attendee' || userData?.role === 'both') ? '*' : '(Optional)'}
                </h3>
                <p className="text-xs mb-4" style={{color: '#6B7280'}}>
                  {(userData?.role === 'attendee' || userData?.role === 'both') 
                    ? 'Please provide at least one social media handle to help others connect with you at events'
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

              {/* Account Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2" style={{color: '#111827'}}>Account Information</h3>
                <div className="text-sm space-y-1" style={{color: '#6B7280'}}>
                  <p><strong>Email:</strong> {userData?.email}</p>
                  <p><strong>Member since:</strong> {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}</p>
                  <p><strong>Events attended:</strong> {userData?.eventsAttended || 0}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 text-white py-3 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  style={{backgroundColor: '#6C63FF'}}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-6 py-3 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center"
                  style={{color: '#EF4444'}}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}