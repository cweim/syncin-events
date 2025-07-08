// components/ReelAnalytics.tsx
// Simple analytics component for tracking reel generation usage


interface ReelAnalyticsProps {
  eventId: string;
  userId: string;
  action: 'generate_started' | 'generate_completed' | 'generate_failed' | 'download' | 'share';
  metadata?: {
    style?: string;
    duration?: number;
    photoCount?: number;
    taskId?: string;
  };
}

export function trackReelEvent(props: ReelAnalyticsProps) {
  // In a real implementation, you would send this to your analytics service
  // For now, we'll just log it
  console.log('📊 Reel Analytics:', {
    timestamp: new Date().toISOString(),
    ...props
  });
  
  // Example: Send to analytics service
  // analytics.track('reel_event', props);
}

export function useReelAnalytics(eventId: string, userId: string) {
  return {
    trackGenerateStarted: (style: string, duration: number, photoCount: number) => {
      trackReelEvent({
        eventId,
        userId,
        action: 'generate_started',
        metadata: { style, duration, photoCount }
      });
    },
    
    trackGenerateCompleted: (taskId: string) => {
      trackReelEvent({
        eventId,
        userId,
        action: 'generate_completed',
        metadata: { taskId }
      });
    },
    
    trackGenerateFailed: (taskId: string) => {
      trackReelEvent({
        eventId,
        userId,
        action: 'generate_failed',
        metadata: { taskId }
      });
    },
    
    trackDownload: (taskId: string) => {
      trackReelEvent({
        eventId,
        userId,
        action: 'download',
        metadata: { taskId }
      });
    },
    
    trackShare: (taskId: string) => {
      trackReelEvent({
        eventId,
        userId,
        action: 'share',
        metadata: { taskId }
      });
    }
  };
}