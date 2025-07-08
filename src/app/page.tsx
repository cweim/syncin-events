// src/app/page.tsx
// Version: 3.0 - Enhanced marketing copy and added pricing navigation

import Link from 'next/link';
import { Camera, Users, QrCode, Sparkles, Download, Heart } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-2xl font-bold" style={{color: '#111827'}}>SyncIn</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/pricing"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Pricing
              </Link>
              <Link
                href="/auth/signin"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg transition-colors text-white font-medium hover:opacity-90"
                style={{backgroundColor: '#6C63FF'}}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{color: '#111827'}}>
              The Social Camera
              <span className="block" style={{color: '#6C63FF'}}>for Events</span>
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto" style={{color: '#6B7280'}}>
              Turn every event into a photo-sharing experience. No app needed — just scan, share, and connect. 
              Get authentic user-generated content while creating memories that last.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center text-white hover:opacity-90"
                style={{backgroundColor: '#6C63FF'}}
              >
                <Camera className="mr-2 h-5 w-5" />
                Start Free Trial
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center border-2 hover:bg-gray-50"
                style={{borderColor: '#6C63FF', color: '#6C63FF'}}
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{color: '#111827'}}>
              Why Organizers Love SyncIn
            </h2>
            <p className="text-xl max-w-2xl mx-auto" style={{color: '#6B7280'}}>
              Create engaging experiences that keep attendees connected and generate valuable content for your brand.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#EDE9FE'}}
              >
                <QrCode className="h-8 w-8" style={{color: '#6C63FF'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>Zero Friction Entry</h3>
              <p style={{color: '#6B7280'}}>
                No app downloads, no signups at the door. Attendees scan your QR code and instantly join the experience. 
                Web-first design that works on any device.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#FFF4E6'}}
              >
                <Heart className="h-8 w-8" style={{color: '#FF9F1C'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>Social & Memorable</h3>
              <p style={{color: '#6B7280'}}>
                Create lasting connections with event-specific profiles, real-time photo sharing, and interactive feeds. 
                Build memory boards that attendees revisit long after the event.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#ECFDF5'}}
              >
                <Download className="h-8 w-8" style={{color: '#22C55E'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>Marketing Gold Mine</h3>
              <p style={{color: '#6B7280'}}>
                Export authentic user-generated content with professional branding. Get high-quality photos, 
                testimonials, and social proof for your next campaign.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div 
          className="rounded-2xl p-8 md:p-12 text-center text-white my-16"
          style={{backgroundColor: '#6C63FF'}}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Turn Your Next Event Into a Social Experience
          </h2>
          <p className="text-xl mb-8" style={{color: '#E0E7FF'}}>
            Join thousands of organizers creating memorable, shareable moments with SyncIn.
            Start your free trial today — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center font-medium hover:bg-gray-100"
              style={{color: '#6C63FF'}}
            >
              <Camera className="mr-2 h-5 w-5" />
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="border border-white text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center hover:bg-white hover:bg-opacity-10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{backgroundColor: '#111827', color: '#9CA3AF'}} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-lg font-semibold">SyncIn</span>
            </div>
            <p className="text-sm mb-6">
              The social camera for events. No app needed.
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="mailto:support@syncin.app" className="hover:text-white transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}