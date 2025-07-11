// lib/video-processing.ts
// Utilities for processing and uploading videos for event posts

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { VideoMetadata } from '@/types';

export interface VideoProcessingResult {
  url: string;
  thumbnailUrl?: string;
  metadata: VideoMetadata;
}

export class VideoProcessor {
  private storage;

  constructor() {
    this.storage = getStorage();
  }

  /**
   * Process and upload a video file to Firebase Storage
   */
  async processAndUpload(
    file: File,
    eventId: string,
    userId: string
  ): Promise<VideoProcessingResult> {
    try {
      // Validate file
      if (!file.type.startsWith('video/')) {
        throw new Error('File must be a video');
      }

      // Check file size (max 50MB for videos)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Video file size must be less than 50MB');
      }

      // Get video metadata
      const metadata = await this.getVideoMetadata(file);

      // Validate duration (must be less than 10 seconds)
      if (metadata.duration >= 10) {
        throw new Error('Video must be less than 10 seconds long');
      }

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(file);

      // Upload video to Firebase Storage
      const timestamp = Date.now();
      const videoFileName = `events/${eventId}/posts/${userId}/${timestamp}.mp4`;
      const thumbnailFileName = `events/${eventId}/posts/${userId}/${timestamp}_thumb.jpg`;

      const videoRef = ref(this.storage, videoFileName);
      const thumbnailRef = ref(this.storage, thumbnailFileName);

      // Upload both video and thumbnail
      const [videoSnapshot, thumbnailSnapshot] = await Promise.all([
        uploadBytes(videoRef, file),
        uploadBytes(thumbnailRef, thumbnail)
      ]);

      const [videoUrl, thumbnailUrl] = await Promise.all([
        getDownloadURL(videoSnapshot.ref),
        getDownloadURL(thumbnailSnapshot.ref)
      ]);

      return {
        url: videoUrl,
        thumbnailUrl,
        metadata: {
          ...metadata,
          thumbnailUrl
        }
      };

    } catch (error) {
      console.error('Error processing video:', error);
      throw error;
    }
  }

  /**
   * Get video metadata including duration, dimensions, and size
   */
  private async getVideoMetadata(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          size: file.size,
          mimeType: file.type
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = url;
    });
  }

  /**
   * Generate thumbnail from video file
   */
  private async generateThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const url = URL.createObjectURL(file);

      video.onloadeddata = () => {
        // Set canvas dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Seek to 1 second or halfway through (whichever is smaller)
        video.currentTime = Math.min(1, video.duration / 2);
      };

      video.onseeked = () => {
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video for thumbnail'));
      };

      video.src = url;
    });
  }

  /**
   * Validate video file for upload
   */
  static validateVideo(file: File): { isValid: boolean; error?: string } {
    if (!file.type.startsWith('video/')) {
      return { isValid: false, error: 'File must be a video' };
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return { isValid: false, error: 'Video file must be less than 50MB' };
    }

    // Check supported formats
    const supportedFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!supportedFormats.includes(file.type)) {
      return { isValid: false, error: 'Supported formats: MP4, WebM, QuickTime' };
    }

    return { isValid: true };
  }

  /**
   * Check video duration without full processing (for quick validation)
   */
  static async checkVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video'));
      };

      video.src = url;
    });
  }
}

export default VideoProcessor;