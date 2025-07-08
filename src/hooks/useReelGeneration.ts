// hooks/useReelGeneration.ts
// React hooks for reel generation API integration

import { useState, useCallback, useEffect } from 'react';

export interface ReelGenerationRequest {
  photoUrls: string[];
  style: 'trendy' | 'elegant' | 'energetic';
  duration: 5 | 10;
  eventId: string;
  userId: string;
}

export interface ReelGenerationResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  message?: string;
  estimatedTime?: string;
}

export interface UseReelGenerationReturn {
  generateReel: (request: ReelGenerationRequest) => Promise<void>;
  checkStatus: (taskId: string) => Promise<ReelGenerationResponse | null>;
  currentTask: ReelGenerationResponse | null;
  isGenerating: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useReelGeneration(): UseReelGenerationReturn {
  const [currentTask, setCurrentTask] = useState<ReelGenerationResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generateReel = useCallback(async (request: ReelGenerationRequest) => {
    try {
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      
      const response = await fetch('/api/reels/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start reel generation');
      }

      const data = await response.json();
      setCurrentTask(data);
      setProgress(10); // Initial progress
      
      // Start polling for status updates
      pollStatus(data.taskId);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsGenerating(false);
    }
  }, []);

  const checkStatus = useCallback(async (taskId: string): Promise<ReelGenerationResponse | null> => {
    try {
      const response = await fetch(`/api/reels/generate?taskId=${taskId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check status');
      }

      const data = await response.json();
      return data;
      
    } catch (err) {
      console.error('Error checking status:', err);
      return null;
    }
  }, []);

  const pollStatus = useCallback(async (taskId: string) => {
    const poll = async () => {
      console.log('🔄 Polling status for task:', taskId);
      const statusData = await checkStatus(taskId);
      
      if (statusData) {
        console.log('📊 Status update:', statusData);
        setCurrentTask(statusData);
        setProgress(statusData.progress);
        
        if (statusData.status === 'completed') {
          console.log('🎉 Reel generation completed!');
          setIsGenerating(false);
          return; // Stop polling
        }
        
        if (statusData.status === 'failed') {
          console.log('❌ Reel generation failed:', statusData.error);
          setError(statusData.error || 'Reel generation failed');
          setIsGenerating(false);
          return; // Stop polling
        }
        
        // Continue polling if still processing
        if (statusData.status === 'processing' || statusData.status === 'pending') {
          console.log('⏳ Still processing, will poll again in 2 seconds');
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } else {
        console.log('⚠️ Could not get status, retrying in 5 seconds');
        // If we can't get status, retry in 5 seconds
        setTimeout(poll, 5000);
      }
    };
    
    poll();
  }, [checkStatus]);

  const reset = useCallback(() => {
    setCurrentTask(null);
    setIsGenerating(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    generateReel,
    checkStatus,
    currentTask,
    isGenerating,
    progress,
    error,
    reset,
  };
}

// Hook for uploading photos before reel generation
export interface UsePhotoUploadReturn {
  uploadPhotos: (files: File[], eventId: string, userId: string) => Promise<string[]>;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  resetUpload: () => void;
}

export function usePhotoUpload(): UsePhotoUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadPhotos = useCallback(async (files: File[], eventId: string, userId: string): Promise<string[]> => {
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('eventId', eventId);
      formData.append('userId', userId);
      
      files.forEach((file, index) => {
        formData.append('photos', file);
      });

      const response = await fetch('/api/reels/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload photos');
      }

      const data = await response.json();
      setUploadProgress(100);
      
      return data.photoUrls;
      
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  return {
    uploadPhotos,
    isUploading,
    uploadProgress,
    uploadError,
    resetUpload,
  };
}

// Hook for real-time progress updates (WebSocket/SSE)
export function useReelProgress(taskId: string | null) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [steps, setSteps] = useState<Array<{ name: string; completed: boolean }>>([
    { name: 'Uploading photos to RunwayML', completed: false },
    { name: 'Processing with AI', completed: false },
    { name: 'Generating video transitions', completed: false },
    { name: 'Finalizing reel', completed: false },
  ]);

  useEffect(() => {
    if (!taskId) return;

    // Update steps based on progress
    const updateSteps = (currentProgress: number) => {
      const newSteps = steps.map((step, index) => ({
        ...step,
        completed: currentProgress > (index + 1) * 25,
      }));
      setSteps(newSteps);
    };

    // In a real implementation, you'd connect to WebSocket or SSE here
    // For now, we'll simulate progress updates
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 10, 100);
        updateSteps(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setStatus('completed');
        }
        
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [taskId]);

  return { progress, status, steps };
}