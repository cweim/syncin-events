// src/app/dashboard/events/[eventId]/page.tsx
// Version: 3.4 - Updated with proper download handling for CORS issues

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Camera, 
  Copy, 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Clock,
  Image as ImageIcon,
  Download,
  Heart,
  MessageCircle,
  DownloadCloud,
  Video,
  Sparkles,
  Play,
  Loader2,
  BarChart3,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import QRCodeReact from 'react-qr-code';
import { getEvent, getAllEventPosts, deleteEvent, getEventParticipants, getUser } from '@/lib/database';
import { getCurrentFirebaseUser } from '@/lib/auth';
import { downloadPhoto, downloadVideo, downloadPostMedia, downloadAllMedia } from '@/lib/download-utils';
import { Event, Post, EventParticipant, User } from '@/types';
import { useRouter } from 'next/navigation';
import { useReelGeneration, usePhotoUpload } from '@/hooks/useReelGeneration';
import { useReelAnalytics } from '@/components/ReelAnalytics';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default function EventDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'qr' | 'album' | 'reels' | 'analytics' | 'settings'>('overview');
  const [copySuccess, setCopySuccess] = useState(false);
  const [eventId, setEventId] = useState<string>('');
  
  // Album tab states
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [albumLoading, setAlbumLoading] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [downloadingAll, setDownloadingAll] = useState(false);
  
  // Reels tab states
  const [selectedPhotosForReel, setSelectedPhotosForReel] = useState<Set<string>>(new Set());
  const [reelStyle, setReelStyle] = useState<'trendy' | 'elegant' | 'energetic'>('trendy');
  const [reelDuration, setReelDuration] = useState<5 | 10>(5);
  const [generatedReelUrl, setGeneratedReelUrl] = useState<string>('');
  
  // Delete event states
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Reel generation states
  const [generationError, setGenerationError] = useState<string>('');
  
  // Analytics tab states
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // API hooks for reel generation
  const {
    generateReel,
    currentTask,
    isGenerating,
    progress,
    error: reelError,
    reset: resetReel
  } = useReelGeneration();
  
  // Photo upload hook (unused for now but ready for future use)
  // const { uploadPhotos, isUploading, uploadProgress, uploadError, resetUpload } = usePhotoUpload();
  
  // Analytics tracking
  const analytics = useReelAnalytics(eventId, 'current-user-id');
  
  // Track completion/failure events
  useEffect(() => {
    if (currentTask?.status === 'completed' && currentTask.taskId) {
      analytics.trackGenerateCompleted(currentTask.taskId);
    } else if (currentTask?.status === 'failed' && currentTask.taskId) {
      analytics.trackGenerateFailed(currentTask.taskId);
    }
  }, [currentTask?.status, currentTask?.taskId, analytics]);

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const firebaseUser = getCurrentFirebaseUser();
        if (!firebaseUser) {
          router.push('/admin/login');
          return;
        }

        const user = await getUser(firebaseUser.uid);
        if (!user) {
          router.push('/admin/login');
          return;
        }

        // Check if user is an organizer
        if (user.role !== 'organizer') {
          router.push('/');
          return;
        }

        setCurrentUser(user);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin/login');
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    const loadEventId = async () => {
      try {
        const resolvedParams = await params;
        console.log('🔍 Resolved params:', resolvedParams);
        console.log('🆔 Event ID from params:', resolvedParams.eventId);
        setEventId(resolvedParams.eventId);
      } catch (error) {
        console.error('❌ Error resolving params:', error);
      }
    };

    loadEventId();
  }, [params]);

  useEffect(() => {
    if (!eventId || !currentUser) {
      console.log('⏳ Waiting for eventId and user authentication...');
      return;
    }

    const loadEvent = async () => {
      try {
        console.log('🔄 Loading event with ID:', eventId);
        
        // Validate eventId
        if (!eventId || eventId.trim() === '') {
          throw new Error('Event ID is empty or invalid');
        }

        const eventData = await getEvent(eventId);
        console.log('✅ Loaded event data:', eventData);
        
        if (!eventData) {
          throw new Error('Event not found in database');
        }

        // Check if the current user is the organizer of this event
        if (eventData.organizerId !== currentUser.id) {
          console.error('❌ User is not the organizer of this event');
          router.push('/dashboard');
          return;
        }
        
        setEvent(eventData);
      } catch (error) {
        console.error('💥 Error loading event:', error);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId, currentUser, router]);

  // Load album data when album tab is activated
  useEffect(() => {
    if (activeTab === 'album' && event && !albumLoading && allPosts.length === 0) {
      loadAlbumData();
    }
  }, [activeTab, event]);

  // Load analytics data when analytics tab is activated
  useEffect(() => {
    if (activeTab === 'analytics' && event && !analyticsLoading && participants.length === 0) {
      loadAnalyticsData();
    }
  }, [activeTab, event]);

  const loadAlbumData = async () => {
    if (!event) return;
    
    setAlbumLoading(true);
    try {
      console.log('🔄 Loading album data for event:', event.id);
      const posts = await getAllEventPosts(event.id);
      setAllPosts(posts);
      console.log(`📸 Loaded ${posts.length} posts for album (including pending)`);
      console.log('📋 Posts data sample:', posts.slice(0, 2));
      
      // Debug image URLs
      const postsWithImages = posts.filter(p => p.imageUrl);
      const postsWithoutImages = posts.filter(p => !p.imageUrl);
      console.log(`🖼️ Posts with images: ${postsWithImages.length}, without images: ${postsWithoutImages.length}`);
      
      if (postsWithImages.length > 0) {
        console.log('🔍 Sample image URL:', postsWithImages[0].imageUrl);
        
        // Test if we can fetch the image directly
        const testImageUrl = postsWithImages[0].imageUrl;
        if (testImageUrl) {
          fetch(testImageUrl, { method: 'HEAD' })
          .then(response => {
            console.log('🌐 Direct image fetch test:', {
              status: response.status,
              ok: response.ok,
              headers: {
                'content-type': response.headers.get('content-type'),
                'content-length': response.headers.get('content-length'),
                'access-control-allow-origin': response.headers.get('access-control-allow-origin')
              }
            });
          })
          .catch(error => {
            console.log('❌ Direct image fetch failed:', error);
          });
        }
      }
      
      if (postsWithoutImages.length > 0) {
        console.log('⚠️ Posts without image URLs:', postsWithoutImages.map(p => p.id));
      }
    } catch (error) {
      console.error('❌ Error loading album data:', error);
      alert('Failed to load album photos. Please try refreshing the page.');
    } finally {
      setAlbumLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!event) return;
    
    setAnalyticsLoading(true);
    try {
      console.log('🔄 Loading analytics data for event:', event.id);
      const eventParticipants = await getEventParticipants(event.id);
      setParticipants(eventParticipants);
      console.log(`📊 Loaded ${eventParticipants.length} participants for analytics`);
      console.log('📋 Participants sample:', eventParticipants.slice(0, 2));
    } catch (error) {
      console.error('❌ Error loading analytics data:', error);
      alert('Failed to load analytics data. Please try refreshing the page.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!event) return;
    
    const eventUrl = `${window.location.origin}/event/${event.eventUrl}`;
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(eventUrl);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = eventUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Show user-friendly error message
      alert('Failed to copy URL. Please manually copy: ' + eventUrl);
    }
  };

  const handleDownloadQR = () => {
    if (!event) return;

    try {
      // Get the QR code SVG element
      const qrContainer = document.querySelector('[data-qr-container]');
      const qrElement = qrContainer?.querySelector('svg') as SVGElement;
      if (!qrElement) {
        console.error('QR Code element not found');
        alert('QR Code not found. Please make sure the QR code is displayed.');
        return;
      }

      // Create a canvas to convert SVG to image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 400;
      canvas.height = 400;

      // Create an image from the SVG
      const svgData = new XMLSerializer().serializeToString(qrElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        // Fill white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.drawImage(img, 50, 50, 300, 300);
        
        // Add event title below QR code
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(event.title, canvas.width / 2, 370);
        ctx.font = '12px Arial';
        ctx.fillText('Scan to join event', canvas.width / 2, 390);

        // Download the image
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_QR_Code.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');

        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code. Please try again.');
    }
  };

  // ✅ UPDATED: Better download function with CORS handling for both images and videos
  const handleDownloadMedia = async (post: Post, customFilename?: string) => {
    try {
      if (customFilename) {
        if (post.mediaType === 'video' && post.videoUrl) {
          await downloadVideo(post.videoUrl, customFilename);
        } else if (post.mediaType === 'image' && post.imageUrl) {
          await downloadPhoto(post.imageUrl, customFilename);
        }
      } else {
        await downloadPostMedia(post, event?.title || 'event');
      }
    } catch (error) {
      console.error('Download failed:', error);
      // Don't show alert for CORS errors - the download utility handles this
    }
  };

  // ✅ Legacy function for backward compatibility
  const handleDownloadPhoto = async (imageUrl: string, filename: string) => {
    try {
      await downloadPhoto(imageUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
      // Don't show alert for CORS errors - the download utility handles this
    }
  };

  // ✅ UPDATED: Better batch download with progress (supports both images and videos)
  const handleDownloadAll = async () => {
    if (!event) return;
    
    setDownloadingAll(true);
    
    try {
      const result = await downloadAllMedia(
        allPosts, 
        event.title, 
        selectedPosts.size > 0 ? selectedPosts : undefined,
        (completed, total) => {
          console.log(`📥 Download progress: ${completed}/${total}`);
          // Optional: Add progress indicator here in the future
        }
      );
      
      console.log(`✅ Download summary: ${result.successCount} successful, ${result.failCount} failed`);
    } catch (error) {
      console.error('Batch download error:', error);
    } finally {
      setDownloadingAll(false);
    }
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const selectAllPosts = () => {
    if (selectedPosts.size === allPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(allPosts.map(post => post.id)));
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !eventId) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?\n\n` +
      'This will permanently delete:\n' +
      `• The event and all its settings\n` +
      `• All ${event.stats.totalParticipants} participants\n` +
      `• All ${event.stats.totalPosts} photos and posts\n` +
      `• All ${event.stats.totalComments} comments\n\n` +
      'This action cannot be undone!'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteEvent(eventId);
      
      // Show success message and redirect
      alert('Event deleted successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      alert(`Error deleting event: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getOptionsArray = (options: any): string[] => {
    if (!options) return [];
    
    // If it's already an array, return it
    if (Array.isArray(options)) {
      return options;
    }
    
    // If it's an object with numeric keys (converted array), convert back to array
    if (typeof options === 'object') {
      const keys = Object.keys(options);
      const isNumericKeys = keys.every(key => /^\d+$/.test(key));
      
      if (isNumericKeys) {
        return keys
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(key => options[key])
          .filter(value => value && value.trim && value.trim() !== '');
      }
    }
    
    return [];
  };

  // Analytics helper functions
  const getAnalyticsData = () => {
    if (!event || !event.prompts || !participants) return null;

    const analytics = event.prompts.map(prompt => {
      const responses = participants
        .filter(p => p.promptResponses && p.promptResponses.length > 0)
        .map(p => p.promptResponses?.find(r => r.question === prompt.question))
        .filter(response => response && response.answer);

      if (prompt.type === 'multipleChoice') {
        // For multiple choice, count each option
        const optionCounts: { [key: string]: number } = {};
        const options = getOptionsArray(prompt.options);
        
        // Initialize counts (include "Others" if allowOthers is enabled)
        options.forEach(option => {
          optionCounts[option] = 0;
        });
        if (prompt.allowOthers && !optionCounts.hasOwnProperty('Others')) {
          optionCounts['Others'] = 0;
        }

        // Track custom "Others" responses
        const othersResponses: string[] = [];

        // Count responses
        responses.forEach(response => {
          if (response?.answer) {
            // Handle comma-separated answers for multiple choice
            const answers = response.answer.split(', ').map(a => a.trim());
            answers.forEach(answer => {
              // Check if this is an "Others" response with custom text
              if (answer.startsWith('Others: ')) {
                if (optionCounts.hasOwnProperty('Others')) {
                  optionCounts['Others']++;
                  // Extract and store the custom text
                  const customText = answer.substring(8); // Remove "Others: " prefix
                  othersResponses.push(customText);
                }
              } else if (optionCounts.hasOwnProperty(answer)) {
                optionCounts[answer]++;
              }
            });
          }
        });

        return {
          question: prompt.question,
          type: prompt.type,
          options: prompt.allowOthers ? [...options, 'Others'] : options,
          data: optionCounts,
          othersResponses: othersResponses,
          totalResponses: responses.length,
          responseRate: participants.length > 0 ? (responses.length / participants.length) * 100 : 0
        };
      } else {
        // For text responses, just return all answers
        return {
          question: prompt.question,
          type: prompt.type,
          answers: responses.map(r => r?.answer || '').filter(a => a),
          totalResponses: responses.length,
          responseRate: participants.length > 0 ? (responses.length / participants.length) * 100 : 0
        };
      }
    });

    return analytics;
  };

  const exportAnalytics = () => {
    if (!event || !participants) return;
    
    const analytics = getAnalyticsData();
    if (!analytics) return;

    // Create CSV content
    let csvContent = `Event: ${event.title}\n`;
    csvContent += `Date: ${new Date(event.startDate).toLocaleDateString()}\n`;
    csvContent += `Total Participants: ${participants.length}\n\n`;

    analytics.forEach((analytic, index) => {
      csvContent += `Question ${index + 1}: ${analytic.question}\n`;
      csvContent += `Type: ${analytic.type}\n`;
      csvContent += `Response Rate: ${analytic.responseRate.toFixed(1)}%\n`;
      csvContent += `Total Responses: ${analytic.totalResponses}\n\n`;

      if (analytic.type === 'multipleChoice') {
        csvContent += `Options,Count,Percentage\n`;
        Object.entries(analytic.data).forEach(([option, count]) => {
          const percentage = analytic.totalResponses > 0 ? (count / analytic.totalResponses) * 100 : 0;
          csvContent += `"${option}",${count},${percentage.toFixed(1)}%\n`;
        });
        
        // Add detailed "Others" responses if available
        if (analytic.othersResponses && analytic.othersResponses.length > 0) {
          csvContent += `\nCustom "Others" Responses:\n`;
          analytic.othersResponses.forEach((response) => {
            csvContent += `"${response}"\n`;
          });
        }
      } else {
        csvContent += `Responses:\n`;
        analytic.answers.forEach((answer) => {
          csvContent += `"${answer}"\n`;
        });
      }
      csvContent += '\n';
    });

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_analytics.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reel Generation Functions
  const handleGenerateReel = async () => {
    if (selectedPhotosForReel.size < 3) {
      alert('Please select at least 3 photos to generate a reel');
      return;
    }

    try {
      // Reset any previous errors
      setGenerationError('');
      setGeneratedReelUrl('');
      
      // Get the selected photos
      const selectedPosts = allPosts.filter(post => selectedPhotosForReel.has(post.id));
      
      // First, convert photo URLs to files for upload (if needed)
      // For now, we'll use the existing URLs directly
      const photoUrls = selectedPosts.map(post => post.imageUrl).filter((url): url is string => !!url);

      console.log('🎬 Starting reel generation with:', {
        photoCount: photoUrls.length,
        style: reelStyle,
        duration: reelDuration
      });

      // Track analytics
      analytics.trackGenerateStarted(reelStyle, reelDuration, photoUrls.length);

      // Start reel generation using the hook
      await generateReel({
        photoUrls,
        style: reelStyle,
        duration: reelDuration,
        eventId: event?.id || '',
        userId: currentUser?.id || ''
      });
      
      console.log('✅ Reel generation started successfully');

    } catch (error) {
      console.error('❌ Error generating reel:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate reel');
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or not an organizer, the useEffect will redirect
  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
          <p style={{color: '#6B7280'}}>Loading event details...</p>
          <p className="text-sm mt-2" style={{color: '#9CA3AF'}}>Event ID: {eventId || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#F9FAFB'}}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{color: '#111827'}}>Event Not Found</h1>
          <p className="mb-4" style={{color: '#6B7280'}}>
            We couldn't find an event with ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{eventId}</span>
          </p>
          <div className="space-x-2">
            <Link 
              href="/dashboard" 
              className="inline-block text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
              style={{backgroundColor: '#6C63FF'}}
            >
              Return to Dashboard
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/event/${event.eventUrl}`;

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F9FAFB'}}>
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center hover:text-gray-900 mr-6 transition-colors" style={{color: '#6B7280'}}>
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-2xl font-bold" style={{color: '#111827'}}>{event.title}</h1>
                <p style={{color: '#6B7280'}}>Event Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                event.status === 'live' ? 'text-white' : 
                event.status === 'draft' ? 'text-orange-800' :
                'text-gray-800'
              }`} style={{
                backgroundColor: event.status === 'live' ? '#22C55E' : 
                                event.status === 'draft' ? '#FFF4E6' :
                                '#F3F4F6'
              }}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#EDE9FE'}}>
                <Users className="h-6 w-6" style={{color: '#6C63FF'}} />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalParticipants}</p>
                <p style={{color: '#6B7280'}}>Participants</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#FFF4E6'}}>
                <Camera className="h-6 w-6" style={{color: '#FF9F1C'}} />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalPosts}</p>
                <p style={{color: '#6B7280'}}>Photos</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#ECFDF5'}}>
                <div className="text-lg" style={{color: '#22C55E'}}>❤️</div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalLikes}</p>
                <p style={{color: '#6B7280'}}>Likes</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#FFF7ED'}}>
                <div className="text-lg" style={{color: '#FF9F1C'}}>💬</div>
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold" style={{color: '#111827'}}>{event.stats.totalComments}</p>
                <p style={{color: '#6B7280'}}>Comments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'overview' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'overview' ? '#6C63FF' : '#6B7280'
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('qr')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'qr'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'qr' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'qr' ? '#6C63FF' : '#6B7280'
                }}
              >
                QR Code & Sharing
              </button>
              <button
                onClick={() => setActiveTab('album')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'album'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'album' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'album' ? '#6C63FF' : '#6B7280'
                }}
              >
                Event Album
              </button>
              <button
                onClick={() => setActiveTab('reels')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'reels'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'reels' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'reels' ? '#6C63FF' : '#6B7280'
                }}
              >
                <Video className="h-4 w-4 mr-1 inline" />
                Create Reels
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'analytics' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'analytics' ? '#6C63FF' : '#6B7280'
                }}
              >
                <BarChart3 className="h-4 w-4 mr-1 inline" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'text-indigo-600'
                    : 'border-transparent hover:text-gray-700'
                }`}
                style={{
                  borderColor: activeTab === 'settings' ? '#6C63FF' : 'transparent',
                  color: activeTab === 'settings' ? '#6C63FF' : '#6B7280'
                }}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Event Details */}
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Event Details</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center mb-3" style={{color: '#6B7280'}}>
                        <MapPin className="h-5 w-5 mr-2" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center mb-3" style={{color: '#6B7280'}}>
                        <Calendar className="h-5 w-5 mr-2" />
                        <span>{new Date(event.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center" style={{color: '#6B7280'}}>
                        <Clock className="h-5 w-5 mr-2" />
                        <span>
                          {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2" style={{color: '#111827'}}>Description</h4>
                      <p style={{color: '#6B7280'}}>{event.description}</p>
                    </div>
                  </div>
                </div>

                {/* Interaction Prompts */}
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Interaction Prompts</h3>
                  <div className="space-y-3">
                    {event.prompts && Array.isArray(event.prompts) && event.prompts.length > 0 ? (
                      event.prompts.map((prompt, index) => (
                        <div key={prompt.id || index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium" style={{color: '#111827'}}>Question {index + 1}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                prompt.type === 'text' ? 'text-blue-800' : 'text-white'
                              }`} style={{
                                backgroundColor: prompt.type === 'text' ? '#DBEAFE' : '#22C55E'
                              }}>
                                {prompt.type === 'text' ? 'Short Text' : 'Multiple Choice'}
                              </span>
                              {prompt.required && (
                                <span className="px-2 py-1 text-xs rounded-full text-white" style={{backgroundColor: '#EF4444'}}>
                                  Required
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="mb-2" style={{color: '#374151'}}>{prompt.question}</p>
                          
                          {/* Options display for multiple choice */}
                          {prompt.type === 'multipleChoice' && (
                            <div className="mt-3">
                              <p className="text-sm mb-2 font-medium" style={{color: '#6B7280'}}>Options:</p>
                              
                              {(() => {
                                const optionsArray = getOptionsArray(prompt.options);
                                if (optionsArray.length > 0) {
                                  return (
                                    <ul className="list-disc list-inside text-sm space-y-1" style={{color: '#6B7280'}}>
                                      {optionsArray.map((option, optIndex) => (
                                        <li key={optIndex}>{option}</li>
                                      ))}
                                    </ul>
                                  );
                                } else {
                                  return (
                                    <div className="p-3 border border-orange-200 rounded-lg" style={{backgroundColor: '#FFF7ED'}}>
                                      <p className="text-sm" style={{color: '#EA580C'}}>
                                        ⚠️ No options found for this multiple choice question.
                                      </p>
                                    </div>
                                  );
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-6 text-center">
                        <p style={{color: '#9CA3AF'}}>
                          No interaction prompts configured for this event.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>QR Code for Event Access</h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <div className="bg-white border-2 border-gray-200 rounded-lg p-8 text-center">
                        <div data-qr-container>
                          <QRCodeReact
                            value={eventUrl}
                            size={200}
                            style={{ margin: '0 auto' }}
                          />
                        </div>
                        <p className="text-sm mt-4" style={{color: '#6B7280'}}>
                          Attendees scan this QR code to join the event
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadQR}
                        className="w-full mt-4 text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
                        style={{backgroundColor: '#6C63FF'}}
                      >
                        Download QR Code
                      </button>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3" style={{color: '#111827'}}>Event URL</h4>
                      <div className="rounded-lg p-4 mb-4" style={{backgroundColor: '#F9FAFB'}}>
                        <code className="text-sm break-all" style={{color: '#374151'}}>{eventUrl}</code>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleCopyUrl}
                          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copySuccess ? 'Copied!' : 'Copy URL'}
                        </button>
                        <a
                          href={eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center hover:opacity-90"
                          style={{backgroundColor: '#6C63FF'}}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open Event
                        </a>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium mb-3" style={{color: '#111827'}}>How to Share</h4>
                        <ul className="text-sm space-y-2" style={{color: '#6B7280'}}>
                          <li>• Display the QR code on screens or posters at your venue</li>
                          <li>• Share the event URL on social media or email</li>
                          <li>• Download and print the QR code for physical materials</li>
                          <li>• Attendees scan or visit the link to join instantly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ✅ UPDATED: Event Album Tab with better download handling */}
            {activeTab === 'album' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium" style={{color: '#111827'}}>Event Album</h3>
                    <p className="text-sm" style={{color: '#6B7280'}}>
                      All media shared at this event ({allPosts.filter(p => p.mediaType === 'image').length} photos, {allPosts.filter(p => p.mediaType === 'video').length} videos, {allPosts.length} total)
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={loadAlbumData}
                      disabled={albumLoading}
                      className="text-sm font-medium transition-colors hover:opacity-80 flex items-center"
                      style={{color: '#6B7280'}}
                      title="Refresh album"
                    >
                      <svg className={`h-4 w-4 mr-1 ${albumLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    
                    {allPosts.length > 0 && (
                      <>
                        <button
                          onClick={selectAllPosts}
                          className="text-sm font-medium transition-colors hover:opacity-80"
                          style={{color: '#6C63FF'}}
                        >
                          {selectedPosts.size === allPosts.length ? 'Deselect All' : 'Select All'}
                        </button>
                        
                        <button
                          onClick={handleDownloadAll}
                          disabled={downloadingAll}
                          className="flex items-center text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{backgroundColor: '#22C55E'}}
                        >
                          {downloadingAll ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <DownloadCloud className="h-4 w-4 mr-2" />
                              Download {selectedPosts.size > 0 ? `Selected (${selectedPosts.size})` : 'All Media'}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {albumLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
                      <p style={{color: '#6B7280'}}>Loading photos...</p>
                    </div>
                  </div>
                ) : allPosts.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                          selectedPosts.has(post.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => togglePostSelection(post.id)}
                      >
                        {post.mediaType === 'video' && post.videoUrl && post.videoUrl.trim() !== '' ? (
                          <div className="relative">
                            {/* Video placeholder with loading indicator */}
                            <div className="w-full h-48 bg-gray-900 flex items-center justify-center">
                              <div className="text-center text-white">
                                <div className="relative">
                                  <Video className="h-12 w-12 mx-auto mb-3 opacity-60" />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                                </div>
                                <p className="text-sm opacity-80">Loading video...</p>
                                <p className="text-xs opacity-60 mt-1">Click to play</p>
                              </div>
                            </div>
                            
                            <video 
                              src={post.videoUrl}
                              className="absolute inset-0 w-full h-48 object-cover opacity-0 transition-opacity duration-300"
                              style={{
                                backgroundColor: '#f3f4f6',
                                minHeight: '192px',
                                display: 'block'
                              }}
                              controls
                              preload="none"
                              muted
                              poster=""
                              onError={(e) => {
                                console.error('❌ Video failed to load:', {
                                  url: post.videoUrl,
                                  postId: post.id,
                                  userId: post.userId,
                                  error: e.type,
                                  timestamp: new Date().toISOString()
                                });
                                const target = e.target as HTMLVideoElement;
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = `
                                    <div class="w-full h-48 bg-red-100 flex items-center justify-center text-red-600 border border-red-300">
                                      <div class="text-center">
                                        <div class="text-2xl mb-2">⚠️</div>
                                        <p class="text-xs font-medium">Video failed to load</p>
                                        <p class="text-xs opacity-75 mt-1">Check network connection</p>
                                      </div>
                                    </div>
                                  `;
                                }
                              }}
                              onLoadStart={() => {
                                console.log('🎥 Video loading started:', {
                                  postId: post.id,
                                  url: post.videoUrl
                                });
                              }}
                              onLoadedData={(e) => {
                                console.log('✅ Video loaded successfully:', {
                                  postId: post.id,
                                  url: post.videoUrl
                                });
                                const target = e.target as HTMLVideoElement;
                                target.style.opacity = '1';
                              }}
                              onCanPlay={(e) => {
                                console.log('🎬 Video can play:', post.id);
                                const target = e.target as HTMLVideoElement;
                                target.style.opacity = '1';
                              }}
                            />
                            
                            {/* Video indicator */}
                            <div className="absolute top-2 right-2 p-1 bg-black bg-opacity-70 text-white rounded-full z-10">
                              <Play className="h-4 w-4" />
                            </div>
                          </div>
                        ) : (
                          post.imageUrl && post.imageUrl.trim() !== '' ? (
                            <img 
                              src={post.imageUrl} 
                              alt={post.caption || 'Event photo'}
                            className="w-full h-48"
                            style={{
                              backgroundColor: '#f3f4f6',
                              minHeight: '192px',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onError={(e) => {
                              console.error('❌ Image failed to load:', {
                                url: post.imageUrl,
                                postId: post.id,
                                userId: post.userId,
                                error: e.type,
                                timestamp: new Date().toISOString()
                              });
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const placeholder = target.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                            onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              console.log('✅ Image loaded successfully:', {
                                postId: post.id,
                                naturalWidth: img.naturalWidth,
                                naturalHeight: img.naturalHeight,
                                displayWidth: img.width,
                                displayHeight: img.height,
                                url: post.imageUrl
                              });
                              
                              // Visual test: add a colored border when image loads
                              img.style.border = '2px solid green';
                              setTimeout(() => {
                                img.style.border = '';
                              }, 2000);
                            }}
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                              <div className="text-center text-gray-500">
                                <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-xs">No image available</p>
                              </div>
                            </div>
                          )
                        )}
                        {/* Error placeholder */}
                        <div 
                          className="w-full h-48 bg-red-100 flex items-center justify-center text-red-600 border border-red-300" 
                          style={{display: 'none'}}
                        >
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                            <p className="text-xs font-medium">Image failed to load</p>
                            <p className="text-xs opacity-75 mt-1">Check console for details</p>
                          </div>
                        </div>
                        
                        {/* Loading placeholder for debugging */}
                        <div 
                          className="absolute inset-0 bg-blue-50 flex items-center justify-center text-blue-600"
                          style={{display: 'none'}}
                          id={`loading-${post.id}`}
                        >
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-xs">Loading image...</p>
                          </div>
                        </div>
                        
                        {/* Selection indicator */}
                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          selectedPosts.has(post.id) 
                            ? 'bg-indigo-500 border-indigo-500' 
                            : 'bg-white border-gray-300 group-hover:border-indigo-400'
                        }`}>
                          {selectedPosts.has(post.id) && (
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>

                        {/* Download button - always visible */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadMedia(post);
                          }}
                          className="absolute top-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all hover:scale-110"
                          title={`Download ${post.mediaType}`}
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Approval status */}
                        {!post.isApproved && (
                          <div className="absolute top-2 left-2 px-2 py-1 text-xs rounded-full text-white" style={{backgroundColor: '#FF9F1C'}}>
                            Pending
                          </div>
                        )}

                        {/* Overlay with post info - Fixed: removed bg-black when not needed */}
                        <div className="absolute inset-0 group-hover:bg-black group-hover:bg-opacity-60 transition-all duration-200 flex items-end">
                          <div className="p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-full">
                            {post.caption && (
                              <p className="text-sm mb-2 line-clamp-2">{post.caption}</p>
                            )}
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-3">
                                <span className="flex items-center">
                                  <Heart className="h-3 w-3 mr-1" />
                                  {post.likesCount}
                                </span>
                                <span className="flex items-center">
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  {post.commentsCount}
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadMedia(post);
                                }}
                                className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                                title={`Download ${post.mediaType}`}
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4" style={{color: '#D1D5DB'}} />
                    <h3 className="text-lg font-semibold mb-2" style={{color: '#111827'}}>No media yet</h3>
                    <p style={{color: '#6B7280'}}>
                      Photos and videos shared by attendees will appear here. Share the event link to get started!
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-2" style={{color: '#111827'}}>
                      <BarChart3 className="h-5 w-5 inline mr-2" />
                      Interaction Prompts Analytics
                    </h3>
                    <p className="text-sm" style={{color: '#6B7280'}}>
                      Analyze responses from your event's interaction prompts
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={loadAnalyticsData}
                      disabled={analyticsLoading}
                      className="text-sm font-medium transition-colors hover:opacity-80 flex items-center"
                      style={{color: '#6B7280'}}
                      title="Refresh analytics"
                    >
                      <svg className={`h-4 w-4 mr-1 ${analyticsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                    
                    {participants.length > 0 && (
                      <button
                        onClick={exportAnalytics}
                        className="flex items-center text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90"
                        style={{backgroundColor: '#22C55E'}}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>

                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style={{borderColor: '#6C63FF'}}></div>
                      <p style={{color: '#6B7280'}}>Loading analytics...</p>
                    </div>
                  </div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4" style={{color: '#D1D5DB'}} />
                    <h3 className="text-lg font-semibold mb-2" style={{color: '#111827'}}>No participants yet</h3>
                    <p style={{color: '#6B7280'}}>
                      Analytics will appear here once attendees join your event and answer the interaction prompts.
                    </p>
                  </div>
                ) : !event.prompts || event.prompts.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4" style={{color: '#D1D5DB'}} />
                    <h3 className="text-lg font-semibold mb-2" style={{color: '#111827'}}>No interaction prompts</h3>
                    <p style={{color: '#6B7280'}}>
                      Add interaction prompts to your event to collect and analyze attendee responses.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {(() => {
                      const analyticsData = getAnalyticsData();
                      if (!analyticsData) return null;

                      return analyticsData.map((analytic, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-medium" style={{color: '#111827'}}>
                              Question {index + 1}
                            </h4>
                            <div className="flex items-center space-x-4 text-sm" style={{color: '#6B7280'}}>
                              <span>{analytic.totalResponses} responses</span>
                              <span>{analytic.responseRate.toFixed(1)}% response rate</span>
                            </div>
                          </div>
                          
                          <p className="text-sm mb-6" style={{color: '#374151'}}>
                            {analytic.question}
                          </p>

                          {analytic.type === 'multipleChoice' ? (
                            <div>
                              <h5 className="text-sm font-medium mb-3" style={{color: '#111827'}}>Response Distribution</h5>
                              <div className="space-y-3">
                                {Object.entries(analytic.data).map(([option, count]) => {
                                  const percentage = analytic.totalResponses > 0 ? (count / analytic.totalResponses) * 100 : 0;
                                  return (
                                    <div key={option} className="flex items-center space-x-3">
                                      <div className="w-32 text-sm truncate" style={{color: '#374151'}} title={option}>
                                        {option}
                                      </div>
                                      <div className="flex-1 relative">
                                        <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                              width: `${percentage}%`,
                                              backgroundColor: percentage > 0 ? '#6C63FF' : 'transparent'
                                            }}
                                          />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                                          {count > 0 && `${count} (${percentage.toFixed(1)}%)`}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {/* Display custom "Others" responses */}
                              {analytic.othersResponses && analytic.othersResponses.length > 0 && (
                                <div className="mt-6">
                                  <h5 className="text-sm font-medium mb-3" style={{color: '#111827'}}>
                                    Custom "Others" Responses ({analytic.othersResponses.length})
                                  </h5>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {analytic.othersResponses.map((response, responseIndex) => (
                                      <div key={responseIndex} className="p-3 bg-gray-50 rounded-lg border-l-4" style={{borderColor: '#6C63FF'}}>
                                        <p className="text-sm" style={{color: '#374151'}}>
                                          &ldquo;{response}&rdquo;
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <h5 className="text-sm font-medium mb-3" style={{color: '#111827'}}>All Responses</h5>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {analytic.answers.map((answer, answerIndex) => (
                                  <div key={answerIndex} className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm" style={{color: '#374151'}}>
                                      &ldquo;{answer}&rdquo;
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Event Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Event Status</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Control whether attendees can join the event</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.isActive ? 'text-white' : 'text-white'
                      }`} style={{
                        backgroundColor: event.isActive ? '#22C55E' : '#EF4444'
                      }}>
                        {event.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Visibility</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Who can find and join this event</p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{backgroundColor: '#6C63FF'}}>
                        {event.visibility.charAt(0).toUpperCase() + event.visibility.slice(1)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Guest Posting</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Allow non-registered users to post photos</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium text-white`} style={{
                        backgroundColor: event.allowGuestPosting ? '#22C55E' : '#EF4444'
                      }}>
                        {event.allowGuestPosting ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium" style={{color: '#111827'}}>Moderation</h4>
                        <p className="text-sm" style={{color: '#6B7280'}}>Review posts before they appear publicly</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium`} style={{
                        backgroundColor: event.moderationEnabled ? '#FF9F1C' : '#22C55E',
                        color: 'white'
                      }}>
                        {event.moderationEnabled ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium mb-4" style={{color: '#111827'}}>Danger Zone</h3>
                  <div className="border rounded-lg p-4" style={{backgroundColor: '#FEF2F2', borderColor: '#FCA5A5'}}>
                    <h4 className="font-medium mb-2" style={{color: '#991B1B'}}>Delete Event</h4>
                    <p className="text-sm mb-4" style={{color: '#DC2626'}}>
                      Permanently delete this event and all associated data. This action cannot be undone.
                    </p>
                    <button 
                      onClick={handleDeleteEvent}
                      disabled={isDeleting}
                      className="text-white px-4 py-2 rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      style={{backgroundColor: '#EF4444'}}
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        'Delete Event'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reels' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-2" style={{color: '#111827'}}>
                      <Video className="h-5 w-5 inline mr-2" />
                      Create AI Reels
                    </h3>
                    <p className="text-sm" style={{color: '#6B7280'}}>
                      Generate Instagram-ready reels from your event photos using AI
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5" style={{color: '#FF9F1C'}} />
                    <span className="text-sm font-medium" style={{color: '#FF9F1C'}}>Powered by RunwayML</span>
                  </div>
                </div>

                {/* Photo Selection */}
                <div>
                  <h4 className="text-md font-medium mb-3" style={{color: '#111827'}}>Select Photos for Reel</h4>
                  <p className="text-sm mb-4" style={{color: '#6B7280'}}>
                    Choose 3-10 photos from your event album to create an engaging reel
                  </p>
                  
                  {allPosts.length > 0 ? (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {allPosts.map((post) => (
                        <div 
                          key={post.id} 
                          className={`relative group border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                            selectedPhotosForReel.has(post.id) 
                              ? 'border-purple-500 ring-2 ring-purple-200' 
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                          onClick={() => {
                            const newSelection = new Set(selectedPhotosForReel);
                            if (newSelection.has(post.id)) {
                              newSelection.delete(post.id);
                            } else if (newSelection.size < 10) {
                              newSelection.add(post.id);
                            }
                            setSelectedPhotosForReel(newSelection);
                          }}
                        >
                          {post.mediaType === 'video' && post.videoUrl && post.videoUrl.trim() !== '' ? (
                            <div className="relative">
                              <video 
                                src={post.videoUrl}
                                className="w-full h-32 object-cover"
                                preload="none"
                                muted
                                poster=""
                                onError={(e) => {
                                  console.error('❌ Video thumbnail failed to load:', {
                                    url: post.videoUrl,
                                    postId: post.id,
                                    error: e.type,
                                    timestamp: new Date().toISOString()
                                  });
                                }}
                                onLoadStart={() => {
                                  console.log('🎥 Video thumbnail loading:', post.id);
                                }}
                                onLoadedData={() => {
                                  console.log('✅ Video thumbnail loaded:', post.id);
                                }}
                                onCanPlay={() => {
                                  console.log('🎬 Video thumbnail can play:', post.id);
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          ) : (
                            post.imageUrl && post.imageUrl.trim() !== '' ? (
                              <img 
                                src={post.imageUrl} 
                                alt={post.caption || 'Event photo'}
                                className="w-full h-32 object-cover"
                              />
                            ) : (
                              <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                  <ImageIcon className="h-4 w-4 mx-auto mb-1" />
                                  <p className="text-xs">No image</p>
                                </div>
                              </div>
                            )
                          )}
                          
                          {/* Selection indicator */}
                          <div className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedPhotosForReel.has(post.id) 
                              ? 'bg-purple-500 border-purple-500' 
                              : 'bg-white border-gray-300 group-hover:border-purple-400'
                          }`}>
                            {selectedPhotosForReel.has(post.id) && (
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          
                          {/* Photo number indicator */}
                          {selectedPhotosForReel.has(post.id) && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center">
                              {Array.from(selectedPhotosForReel).indexOf(post.id) + 1}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Camera className="h-12 w-12 mx-auto mb-4" style={{color: '#9CA3AF'}} />
                      <p className="text-sm" style={{color: '#6B7280'}}>No photos available yet</p>
                      <p className="text-xs mt-1" style={{color: '#9CA3AF'}}>Photos will appear here once uploaded to the event</p>
                    </div>
                  )}
                  
                  {selectedPhotosForReel.size > 0 && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm" style={{color: '#7C3AED'}}>
                        {selectedPhotosForReel.size} photo{selectedPhotosForReel.size > 1 ? 's' : ''} selected 
                        {selectedPhotosForReel.size < 3 && (
                          <span style={{color: '#DC2626'}}>(minimum 3 required)</span>
                        )}
                        {selectedPhotosForReel.size >= 10 && (
                          <span style={{color: '#059669'}}>(maximum reached)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reel Customization */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Style Selection */}
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{color: '#111827'}}>Reel Style</h4>
                    <div className="space-y-2">
                      {[
                        { value: 'trendy', label: 'Trendy', description: 'Modern cuts with upbeat transitions' },
                        { value: 'elegant', label: 'Elegant', description: 'Smooth transitions with classy effects' },
                        { value: 'energetic', label: 'Energetic', description: 'Fast-paced with dynamic movements' }
                      ].map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setReelStyle(style.value as 'trendy' | 'elegant' | 'energetic')}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            reelStyle === style.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="font-medium" style={{color: reelStyle === style.value ? '#7C3AED' : '#111827'}}>
                            {style.label}
                          </div>
                          <div className="text-sm" style={{color: '#6B7280'}}>
                            {style.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration Selection */}
                  <div>
                    <h4 className="text-md font-medium mb-3" style={{color: '#111827'}}>Duration</h4>
                    <div className="space-y-2">
                      {[
                        { value: 5, label: '5 seconds', description: 'Quick highlight reel' },
                        { value: 10, label: '10 seconds', description: 'Perfect for social media' }
                      ].map((duration) => (
                        <button
                          key={duration.value}
                          onClick={() => setReelDuration(duration.value as 5 | 10)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            reelDuration === duration.value
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="font-medium" style={{color: reelDuration === duration.value ? '#7C3AED' : '#111827'}}>
                            {duration.label}
                          </div>
                          <div className="text-sm" style={{color: '#6B7280'}}>
                            {duration.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium" style={{color: '#111827'}}>Ready to Create?</h4>
                      <p className="text-sm" style={{color: '#6B7280'}}>Generate your AI-powered reel in {reelStyle} style</p>
                    </div>
                    <button
                      onClick={handleGenerateReel}
                      disabled={selectedPhotosForReel.size < 3 || isGenerating}
                      className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium transition-all hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Reel
                        </>
                      )}
                    </button>
                  </div>
                  
                  {selectedPhotosForReel.size < 3 && (
                    <p className="text-sm mt-2" style={{color: '#DC2626'}}>Please select at least 3 photos to generate a reel</p>
                  )}
                  
                  {/* Error Messages */}
                  {(reelError || generationError) && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm" style={{color: '#DC2626'}}>
                        {reelError || generationError}
                      </p>
                      <button 
                        onClick={() => {
                          resetReel();
                          setGenerationError('');
                        }}
                        className="text-xs mt-2 text-red-600 hover:text-red-800 underline"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Indicator */}
                {isGenerating && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium" style={{color: '#7C3AED'}}>Creating Your Reel</h4>
                      <span className="text-sm font-medium" style={{color: '#7C3AED'}}>{progress || 0}%</span>
                    </div>
                    
                    <div className="w-full bg-purple-200 rounded-full h-2 mb-4">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{width: `${progress || 0}%`}}
                      ></div>
                    </div>
                    
                    <div className="space-y-2 text-sm" style={{color: '#6B7280'}}>
                      <div className={`flex items-center ${(progress || 0) >= 20 ? 'text-green-600' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${(progress || 0) >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Uploading photos to RunwayML
                      </div>
                      <div className={`flex items-center ${(progress || 0) >= 40 ? 'text-green-600' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${(progress || 0) >= 40 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Processing with AI
                      </div>
                      <div className={`flex items-center ${(progress || 0) >= 70 ? 'text-green-600' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${(progress || 0) >= 70 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Generating video transitions
                      </div>
                      <div className={`flex items-center ${(progress || 0) >= 95 ? 'text-green-600' : ''}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${(progress || 0) >= 95 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        Finalizing reel
                      </div>
                    </div>
                    
                    {/* Show current task info */}
                    {currentTask && (
                      <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                        <p className="text-sm font-medium" style={{color: '#7C3AED'}}>Status: {currentTask.status}</p>
                        {currentTask.estimatedTime && (
                          <p className="text-xs" style={{color: '#6B7280'}}>Estimated time: {currentTask.estimatedTime}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Generated Reel Preview */}
                {(generatedReelUrl || currentTask?.videoUrl) && (
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium" style={{color: '#059669'}}>Reel Generated Successfully!</h4>
                      <div className="flex items-center space-x-2">
                        <Play className="h-4 w-4" style={{color: '#059669'}} />
                        <span className="text-sm font-medium" style={{color: '#059669'}}>Ready to share</span>
                      </div>
                    </div>
                    
                    {(generatedReelUrl || currentTask?.videoUrl) && (generatedReelUrl || currentTask?.videoUrl)?.trim() !== '' ? (
                      <video 
                        src={generatedReelUrl || currentTask?.videoUrl}
                        controls
                        className="w-full max-w-sm rounded-lg mb-4"
                        style={{backgroundColor: '#000'}}
                      />
                    ) : (
                      <div className="w-full max-w-sm h-48 bg-gray-200 flex items-center justify-center rounded-lg mb-4">
                        <div className="text-center text-gray-500">
                          <Video className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">No video available</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => {
                          const videoUrl = generatedReelUrl || currentTask?.videoUrl;
                          if (videoUrl) {
                            const a = document.createElement('a');
                            a.href = videoUrl;
                            a.download = `${event?.title || 'reel'}-${Date.now()}.mp4`;
                            a.click();
                            analytics.trackDownload(currentTask?.taskId || '');
                          }
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Reel
                      </button>
                      <button 
                        onClick={() => {
                          const videoUrl = generatedReelUrl || currentTask?.videoUrl;
                          if (videoUrl) {
                            window.open(`https://www.instagram.com/`, '_blank');
                            analytics.trackShare(currentTask?.taskId || '');
                          }
                        }}
                        className="border border-green-600 text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-green-50 transition-colors"
                      >
                        Share to Instagram
                      </button>
                      <button 
                        onClick={() => {
                          resetReel();
                          setGeneratedReelUrl('');
                          setGenerationError('');
                          setSelectedPhotosForReel(new Set());
                        }}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Generate Another
                      </button>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-start">
                    <Sparkles className="h-5 w-5 mt-0.5 mr-3" style={{color: '#3B82F6'}} />
                    <div>
                      <h5 className="text-sm font-medium mb-1" style={{color: '#1E40AF'}}>AI-Powered Reel Creation</h5>
                      <p className="text-sm" style={{color: '#3B82F6'}}>
                        Our AI analyzes your photos and creates professional transitions, timing, and effects based on the style you choose. 
                        Generated reels are optimized for Instagram and other social platforms.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}