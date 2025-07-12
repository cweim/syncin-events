// src/app/about/page.tsx
// About page explaining SyncIn's purpose and functionality

import { Camera, Users, QrCode, Sparkles, Download, Heart, CheckCircle, Mail, Phone } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-6">
            <div className="flex items-center">
              <Camera className="h-8 w-8" style={{color: '#6C63FF'}} />
              <span className="ml-2 text-2xl font-bold" style={{color: '#111827'}}>SyncIn</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{color: '#111827'}}>
            About <span style={{color: '#6C63FF'}}>SyncIn</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto" style={{color: '#6B7280'}}>
            The community-driven photo-sharing platform that transforms events into engaging, 
            memorable social experiences — no app downloads required.
          </p>
        </div>

        {/* What We Do */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6" style={{color: '#111827'}}>What We Do</h2>
          <p className="text-lg mb-4" style={{color: '#6B7280'}}>
            SyncIn is designed specifically for event organizers who want to create more fun, connection, 
            and shareable moments at their events. We turn every gathering into a mini social network 
            where attendees can capture, share, and engage with authentic moments.
          </p>
          <p className="text-lg" style={{color: '#6B7280'}}>
            Whether you're planning team-building events, community meetups, conferences, weddings, 
            alumni gatherings, or company offsites, SyncIn helps you build lasting connections while 
            generating valuable user-generated content for your brand.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-8 text-center" style={{color: '#111827'}}>How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#EDE9FE'}}
              >
                <QrCode className="h-8 w-8" style={{color: '#6C63FF'}} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{color: '#111827'}}>1. Create & Share</h3>
              <p style={{color: '#6B7280'}}>
                Organizers create an event dashboard with custom prompts and generate a QR code. 
                Display it at your venue for instant access.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#FFF4E6'}}
              >
                <Camera className="h-8 w-8" style={{color: '#FF9F1C'}} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{color: '#111827'}}>2. Scan & Connect</h3>
              <p style={{color: '#6B7280'}}>
                Attendees scan the QR code, create profiles with fun prompts, and start sharing photos. 
                No app download required — it's all web-based.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center p-6 bg-white rounded-xl shadow-sm">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{backgroundColor: '#ECFDF5'}}
              >
                <Heart className="h-8 w-8" style={{color: '#22C55E'}} />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{color: '#111827'}}>3. Engage & Remember</h3>
              <p style={{color: '#6B7280'}}>
                View a live feed, interact with others' posts, and create lasting memories. 
                Events stay accessible for future visits and photo downloads.
              </p>
            </div>
          </div>
        </div>

        {/* App Demo Video */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center" style={{color: '#111827'}}>See SyncIn in Action</h2>
          <p className="text-lg mb-8 text-center" style={{color: '#6B7280'}}>
            Watch how attendees experience our platform at events
          </p>
          
          <div className="max-w-md mx-auto">
            <div className="relative pb-[177.78%] h-0 overflow-hidden rounded-lg shadow-lg">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/cyan6jhRlgQ"
                title="SyncIn Event Attendee App Flow"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center" style={{color: '#111827'}}>
            Ready to make your event more memorable with us?
          </h2>
          <p className="text-lg mb-8 text-center" style={{color: '#6B7280'}}>
            Get in touch to learn how SyncIn can transform your next event
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <div className="flex items-center">
              <Mail className="h-6 w-6 mr-3" style={{color: '#6C63FF'}} />
              <div>
                <p className="font-semibold" style={{color: '#111827'}}>Email</p>
                <p style={{color: '#6B7280'}}>weiming1902@gmail.com</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Phone className="h-6 w-6 mr-3" style={{color: '#6C63FF'}} />
              <div>
                <p className="font-semibold" style={{color: '#111827'}}>Phone</p>
                <p style={{color: '#6B7280'}}>+65 80325190</p>
              </div>
            </div>
          </div>
        </div>

        {/* Perfect For */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
          <h2 className="text-3xl font-bold mb-6" style={{color: '#111827'}}>Perfect For</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Corporate Events',
              'Team Building',
              'Conferences',
              'Weddings',
              'Alumni Reunions',
              'Community Meetups',
              'Orientation Camps',
              'Company Offsites',
              'Networking Events'
            ].map((eventType, index) => (
              <div key={index} className="flex items-center p-3 rounded-lg" style={{backgroundColor: '#F8FAFC'}}>
                <Sparkles className="h-5 w-5 mr-3" style={{color: '#6C63FF'}} />
                <span style={{color: '#374151'}}>{eventType}</span>
              </div>
            ))}
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
            <p className="text-sm">
              The social camera for events. No app needed.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}