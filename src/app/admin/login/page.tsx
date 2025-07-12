// src/app/admin/login/page.tsx
// Admin/Organizer login page - separate from event attendee flow

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Settings, ArrowLeft } from 'lucide-react';
import { signInWithGoogle } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize allowed emails from environment
  useEffect(() => {
    const allowedEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS;
    if (allowedEmailsEnv) {
      setAllowedEmails(allowedEmailsEnv.split(',').map(email => email.trim()));
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { user, isNewUser } = await signInWithGoogle();
      
      // Check if user's email is in the allowed list
      if (!user.email || !allowedEmails.includes(user.email)) {
        setError('Access denied. You are not authorized to access the admin dashboard.');
        return;
      }

      // Always ensure admin users have organizer role
      console.log('🔄 Admin Login: Ensuring user has organizer role...');
      const { updateUser, getUser } = await import('@/lib/auth');
      await updateUser(user.uid, { role: 'organizer' });
      console.log('✅ Admin Login: Updated user role to organizer');
      
      // Verify the update worked
      const { getUser: getDatabaseUser } = await import('@/lib/database');
      const updatedUser = await getDatabaseUser(user.uid);
      console.log('🔍 Admin Login: Verified user role after update:', updatedUser?.role);

      console.log('✅ Admin Login: Admin access granted for:', user.email);
      console.log('🔄 Admin Login: Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(errorMessage);
      console.error('Google sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center" style={{color: '#6B7280'}}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to Home</span>
            </Link>
            <div className="flex items-center">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-lg font-bold" style={{color: '#111827'}}>SyncIn</span>
              <span className="ml-2 px-2 py-1 text-xs rounded-full text-white font-medium" style={{backgroundColor: '#FF9F1C'}}>
                Admin
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* Welcome Text */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Settings className="h-12 w-12" style={{color: '#6C63FF'}} />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{color: '#111827'}}>
                Organizer Dashboard
              </h1>
              <p style={{color: '#6B7280'}}>
                Sign in to manage your events and access analytics
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg border" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
                <p className="text-sm" style={{color: '#DC2626'}}>{error}</p>
              </div>
            )}

            {/* Google Sign In */}
            <div className="space-y-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
              
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Admin access restricted to authorized accounts only
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}