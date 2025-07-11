// src/app/admin/register/page.tsx
// Admin/Organizer registration page - for creating new organizer accounts

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Mail, Eye, EyeOff, User, Settings, ArrowLeft, Check } from 'lucide-react';
import { registerOrganizer } from '@/lib/auth';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setError('Display name is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await registerOrganizer(formData.email, formData.password, formData.displayName);
      // After successful registration, redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organizer account';
      setError(errorMessage);
      console.error('Organizer registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const password = formData.password;
    if (password.length === 0) return { score: 0, text: '', color: '' };
    if (password.length < 6) return { score: 1, text: 'Too short', color: '#EF4444' };
    if (password.length < 8) return { score: 2, text: 'Weak', color: '#F59E0B' };
    if (password.length < 12) return { score: 3, text: 'Good', color: '#10B981' };
    return { score: 4, text: 'Strong', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-screen flex flex-col" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin/login" className="flex items-center" style={{color: '#6B7280'}}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              <span className="text-sm">Back to Login</span>
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
                Create Organizer Account
              </h1>
              <p style={{color: '#6B7280'}}>
                Set up your admin account to start managing events
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-lg border" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
                <p className="text-sm" style={{color: '#DC2626'}}>{error}</p>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{color: '#9CA3AF'}} />
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                    placeholder="Your full name"
                  />
                </div>
              </div>

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
                    placeholder="Create a secure password"
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
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{color: '#6B7280'}}>Password strength:</span>
                      <span style={{color: passwordStrength.color}}>{passwordStrength.text}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="h-1 rounded-full transition-all duration-300"
                        style={{
                          width: `${(passwordStrength.score / 4) * 100}%`,
                          backgroundColor: passwordStrength.color
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: '#111827'}}>
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{color: '#111827'}}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" style={{color: '#9CA3AF'}} />
                    ) : (
                      <Eye className="h-5 w-5" style={{color: '#9CA3AF'}} />
                    )}
                  </button>
                </div>
                
                {/* Password Match Indicator */}
                {formData.confirmPassword && (
                  <div className="mt-2 flex items-center text-xs">
                    {formData.password === formData.confirmPassword ? (
                      <>
                        <Check className="h-3 w-3 mr-1" style={{color: '#10B981'}} />
                        <span style={{color: '#10B981'}}>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 mr-1 rounded-full" style={{backgroundColor: '#EF4444'}}></span>
                        <span style={{color: '#EF4444'}}>Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white py-3 rounded-lg font-semibold transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                style={{backgroundColor: '#6C63FF'}}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating account...
                  </>
                ) : (
                  'Create Organizer Account'
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-sm" style={{color: '#6B7280'}}>
                Already have an organizer account?{' '}
                <Link 
                  href="/admin/login" 
                  className="font-medium underline" 
                  style={{color: '#6C63FF'}}
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Note */}
            <div className="mt-4 p-3 rounded-lg" style={{backgroundColor: '#F0F9FF', border: '1px solid #0EA5E9'}}>
              <p className="text-xs" style={{color: '#0369A1'}}>
                <strong>Note:</strong> Organizer accounts have full access to create and manage events, view analytics, and access the admin dashboard.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}