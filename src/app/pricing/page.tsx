// src/app/pricing/page.tsx
// SyncIn Pricing Page

'use client';

import Link from 'next/link';
import { Camera, Check, Users, Zap, Star, Download, Palette } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Camera className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">SyncIn</span>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </Link>
              <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign In
              </Link>
              <Link 
                href="/auth/signup"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            SyncIn Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Flexible, affordable plans for event organizers — from one-time events to recurring meetups.
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              No app download needed
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              QR code access
            </div>
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-500 mr-2" />
              Instant setup
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Free Tier */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Start Free</h2>
            <p className="text-gray-600">Perfect for first-time users to try the experience</p>
          </div>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Lite Plan</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">Free</div>
                <p className="text-gray-600">Perfect for trying SyncIn</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">1 event (trial)</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Up to 10 attendees</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Basic photo sharing & profiles</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">SyncIn watermark branding</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Optional 7-day media expiry</span>
                </li>
              </ul>
              
              <Link
                href="/auth/signup"
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>

        {/* Pay-Per-Event */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Pay-Per-Event</h2>
            <p className="text-gray-600">Flat pricing per event. No subscription required.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Basic */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Basic</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">$29</div>
                <p className="text-gray-600">Up to 100 attendees</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <Users className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">100 attendees max</span>
                </li>
                <li className="flex items-center text-sm">
                  <Camera className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Unlimited photos</span>
                </li>
                <li className="flex items-center text-sm">
                  <Download className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center text-sm">
                  <Palette className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
              </ul>
              
              <button className="w-full border border-indigo-600 text-indigo-600 py-2 px-4 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                Choose Basic
              </button>
            </div>

            {/* Growth */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Growth</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">$59</div>
                <p className="text-gray-600">Up to 300 attendees</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <Users className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">300 attendees max</span>
                </li>
                <li className="flex items-center text-sm">
                  <Camera className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Unlimited photos</span>
                </li>
                <li className="flex items-center text-sm">
                  <Download className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center text-sm">
                  <Palette className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
              </ul>
              
              <button className="w-full border border-indigo-600 text-indigo-600 py-2 px-4 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                Choose Growth
              </button>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-600 p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">$89</div>
                <p className="text-gray-600">Up to 500 attendees</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <Users className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">500 attendees max</span>
                </li>
                <li className="flex items-center text-sm">
                  <Camera className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Unlimited photos</span>
                </li>
                <li className="flex items-center text-sm">
                  <Download className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center text-sm">
                  <Palette className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
              </ul>
              
              <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Choose Pro
              </button>
            </div>

            {/* Max */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Max</h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">$129</div>
                <p className="text-gray-600">Unlimited attendees</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-sm">
                  <Users className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Unlimited attendees</span>
                </li>
                <li className="flex items-center text-sm">
                  <Camera className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Unlimited photos</span>
                </li>
                <li className="flex items-center text-sm">
                  <Download className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center text-sm">
                  <Palette className="h-4 w-4 text-indigo-600 mr-2" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
              </ul>
              
              <button className="w-full border border-indigo-600 text-indigo-600 py-2 px-4 rounded-lg font-medium hover:bg-indigo-50 transition-colors">
                Choose Max
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Subscriptions */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Monthly Subscriptions</h2>
            <p className="text-gray-600">For organizers running regular events</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">$49</div>
                <p className="text-gray-600">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">5 events per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">100 attendees per event</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Memory boards</span>
                </li>
              </ul>
              
              <button className="w-full border border-indigo-600 text-indigo-600 py-3 px-6 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                Start Starter
              </button>
            </div>

            {/* Pro */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-600 p-8 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">$99</div>
                <p className="text-gray-600">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">10 events per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">250 attendees per event</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Memory boards</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Priority support</span>
                </li>
              </ul>
              
              <button className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                Start Pro
              </button>
            </div>

            {/* Studio */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Studio</h3>
                <div className="text-4xl font-bold text-gray-900 mb-1">$249</div>
                <p className="text-gray-600">per month</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">30 events per month</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Unlimited attendees</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom branding</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Photo exports</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Memory boards</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">White-label options</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Dedicated support</span>
                </li>
              </ul>
              
              <button className="w-full border border-indigo-600 text-indigo-600 py-3 px-6 rounded-lg font-semibold hover:bg-indigo-50 transition-colors">
                Start Studio
              </button>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to create memorable events?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of organizers using SyncIn to capture and share amazing moments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
            >
              <Zap className="h-5 w-5 mr-2" />
              Start Free Trial
            </Link>
            <Link
              href="/auth/signin"
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-indigo-400" />
              <span className="ml-2 text-2xl font-bold">SyncIn</span>
            </div>
            <p className="text-gray-400 mb-6">
              The social camera for events. No app needed.
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white">
                Terms
              </Link>
              <Link href="mailto:support@syncin.app" className="text-gray-400 hover:text-white">
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}