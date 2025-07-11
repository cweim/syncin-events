// src/app/admin/login/page.tsx
// Admin/Organizer login page - separate from event attendee flow

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Mail, Eye, EyeOff, Settings, ArrowLeft } from 'lucide-react';
import { signInOrganizer, getCurrentFirebaseUser, signInWithGoogle } from '@/lib/auth';
import { getUser } from '@/lib/database';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already signed in and is an organizer
    const checkAuth = async () => {
      const firebaseUser = getCurrentFirebaseUser();
      if (firebaseUser) {
        try {
          const user = await getUser(firebaseUser.uid);
          if (user && user.role === 'organizer') {
            router.push('/dashboard');
          }
        } catch (error) {
          console.error('Error checking user role:', error);
        }
      }
    };
    checkAuth();
  }, [router]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await signInOrganizer(formData.email, formData.password);
      
      // Check if user is actually an organizer
      if (user.role !== 'organizer') {
        setError('This account does not have organizer privileges. Please contact support if you believe this is an error.');
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
      console.error('Admin sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      const { user: firebaseUser, isNewUser } = await signInWithGoogle();
      
      // Get user data from database
      const user = await getUser(firebaseUser.uid);
      
      if (isNewUser || !user) {
        setError('This Google account is not registered as an organizer. Please use the event attendee flow or contact support.');
        return;
      }

      // Check if user is actually an organizer
      if (user.role !== 'organizer') {
        setError('This account does not have organizer privileges. Please contact support if you believe this is an error.');
        return;
      }

      router.push('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(errorMessage);
      console.error('Google admin sign in error:', error);
    } finally {
      setIsGoogleLoading(false);
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

            {/* Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{color: '#9CA3AF'}} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                    placeholder="admin@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" style={{color: '#9CA3AF'}} />
                    ) : (
                      <Eye className="h-5 w-5" style={{color: '#9CA3AF'}} />
                    )}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white py-3 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{backgroundColor: '#6C63FF'}}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm" style={{color: '#6B7280'}}>or</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGoogleLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 mr-2"></div>
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span style={{color: '#374151'}}>
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
              </span>
            </button>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm" style={{color: '#6B7280'}}>
                Don't have an organizer account?{' '}
                <Link 
                  href="/admin/register" 
                  className="font-medium underline" 
                  style={{color: '#6C63FF'}}
                >
                  Create one here
                </Link>
              </p>
              <div className="mt-2">
                <Link 
                  href="/auth/signin" 
                  className="text-xs underline" 
                  style={{color: '#9CA3AF'}}
                >
                  Join an event as attendee instead
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}