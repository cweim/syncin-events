import Link from 'next/link';
import { Camera, Users, QrCode, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">SyncIn</span>
            </div>
            <div className="flex space-x-4">
              <Link
                href="/dashboard"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Organizer Dashboard
              </Link>
              <button className="text-gray-600 hover:text-gray-900 px-4 py-2">
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
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Make Your Events
              <span className="text-purple-600 block">More Social</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Community-driven photo sharing for events. Get attendees engaged, 
              create lasting memories, and generate amazing content for your next event.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors inline-flex items-center justify-center"
              >
                <Users className="mr-2 h-5 w-5" />
                Create Your Event
              </Link>
              <button className="border border-purple-600 text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-50 transition-colors inline-flex items-center justify-center">
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
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">QR Code Access</h3>
              <p className="text-gray-600">
                No app downloads needed. Attendees scan a QR code and instantly join your event&apos;s photo sharing experience.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Social Photo Sharing</h3>
              <p className="text-gray-600">
                Create event-specific profiles, share photos with captions, and engage with other attendees in real-time.
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-2">Content for Marketing</h3>
              <p className="text-gray-600">
                Get authentic user-generated content from your events. Download all photos and use them for future promotions.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-purple-600 rounded-2xl p-8 md:p-12 text-center text-white my-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to make your next event unforgettable?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join event organizers who are creating more engaging, shareable experiences.
          </p>
          <Link
            href="/dashboard"
            className="bg-white text-purple-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center"
          >
            Get Started Free
            <Sparkles className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <Camera className="h-6 w-6 text-purple-400" />
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