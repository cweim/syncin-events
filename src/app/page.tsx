// src/app/page.tsx
// Version: 2.0 - Updated to new soft indigo/orange color palette

import Link from 'next/link';
import { Camera, Users, QrCode, Sparkles } from 'lucide-react';

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
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg transition-colors text-white font-medium hover:opacity-90"
                style={{backgroundColor: '#6C63FF'}}
              >
                Organizer Dashboard
              </Link>
              <button 
                className="px-4 py-2 hover:text-gray-900 transition-colors"
                style={{color: '#6B7280'}}
              >
                Join Event
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{color: '#111827'}}>
              Make Your Events
              <span className="block" style={{color: '#6C63FF'}}>More Social</span>
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto" style={{color: '#6B7280'}}>
              Community-driven photo sharing for events. Get attendees engaged, 
              create lasting memories, and generate amazing content for your next event.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center text-white hover:opacity-90"
                style={{backgroundColor: '#6C63FF'}}
              >
                <Users className="mr-2 h-5 w-5" />
                Create Your Event
              </Link>
              <button 
                className="border-2 px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center hover:bg-opacity-10"
                style={{
                  borderColor: '#6C63FF',
                  color: '#6C63FF',
                  backgroundColor: 'transparent'
                }}
              >
                <QrCode className="mr-2 h-5 w-5" />
                Join with QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#EDE9FE'}}
              >
                <QrCode className="h-8 w-8" style={{color: '#6C63FF'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>QR Code Access</h3>
              <p style={{color: '#6B7280'}}>
                No app downloads needed. Attendees scan a QR code and instantly join your event&apos;s photo sharing experience.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#FFF4E6'}}
              >
                <Camera className="h-8 w-8" style={{color: '#FF9F1C'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>Social Photo Sharing</h3>
              <p style={{color: '#6B7280'}}>
                Create event-specific profiles, share photos with captions, and engage with other attendees in real-time.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#ECFDF5'}}
              >
                <Sparkles className="h-8 w-8" style={{color: '#22C55E'}} />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{color: '#111827'}}>Content for Marketing</h3>
              <p style={{color: '#6B7280'}}>
                Get authentic user-generated content from your events. Download all photos and use them for future promotions.
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
            Ready to make your next event unforgettable?
          </h2>
          <p className="text-xl mb-8" style={{color: '#E0E7FF'}}>
            Join event organizers who are creating more engaging, shareable experiences.
          </p>
          <Link
            href="/dashboard"
            className="bg-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-flex items-center font-medium hover:bg-gray-100"
            style={{color: '#6C63FF'}}
          >
            Get Started Free
            <Sparkles className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{backgroundColor: '#111827', color: '#9CA3AF'}} className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Camera className="h-6 w-6" style={{color: '#6C63FF'}} />
            <span className="ml-2 text-lg font-semibold">SyncIn</span>
          </div>
          <p className="text-center mt-4 text-sm">
            Making events more social, one photo at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}