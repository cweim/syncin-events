// lib/photo-processing.ts
// Utilities for processing and uploading photos for reel generation

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface PhotoProcessingResult {
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export class PhotoProcessor {
  private storage;

  constructor() {
    this.storage = getStorage();
  }

  /**
   * Process and upload a single photo to Firebase Storage
   */
  async processAndUpload(
    file: File,
    eventId: string,
    userId: string,
    index: number
  ): Promise<PhotoProcessingResult> {
    try {
      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Create optimized image
      const optimizedFile = await this.optimizeImage(file);

      // Upload to Firebase Storage
      const fileName = `reels/${eventId}/${userId}/photo_${index}_${Date.now()}.${this.getFileExtension(optimizedFile.name)}`;
      const storageRef = ref(this.storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, optimizedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(optimizedFile);

      return {
        url: downloadURL,
        width: dimensions.width,
        height: dimensions.height,
        size: optimizedFile.size,
        format: optimizedFile.type
      };

    } catch (error) {
      console.error('Error processing photo:', error);
      throw error;
    }
  }

  /**
   * Process multiple photos in parallel
   */
  async processMultiplePhotos(
    files: File[],
    eventId: string,
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<PhotoProcessingResult[]> {
    const results: PhotoProcessingResult[] = [];
    let completed = 0;

    const uploadPromises = files.map(async (file, index) => {
      try {
        const result = await this.processAndUpload(file, eventId, userId, index);
        completed++;
        if (onProgress) {
          onProgress(Math.round((completed / files.length) * 100));
        }
        return result;
      } catch (error) {
        completed++;
        if (onProgress) {
          onProgress(Math.round((completed / files.length) * 100));
        }
        throw error;
      }
    });

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error processing multiple photos:', error);
      throw error;
    }
  }

  /**
   * Optimize image for reel generation
   */
  private async optimizeImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions (9:16 aspect ratio for reels)
        const targetRatio = 9 / 16;
        let { width, height } = img;
        
        // Max resolution for efficient processing
        const maxWidth = 1080;
        const maxHeight = 1920;

        // Scale down if too large
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width *= scale;
          height *= scale;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw optimized image
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(optimizedFile);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        }, 'image/jpeg', 0.85); // 85% quality for good balance
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get image dimensions
   */
  private async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    return filename.split('.').pop() || 'jpg';
  }

  /**
   * Validate photo selection for reel generation
   */
  static validatePhotoSelection(files: File[]): { isValid: boolean; error?: string } {
    if (files.length < 3) {
      return { isValid: false, error: 'Please select at least 3 photos' };
    }

    if (files.length > 10) {
      return { isValid: false, error: 'Please select no more than 10 photos' };
    }

    // Check file types
    const invalidFiles = files.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      return { isValid: false, error: 'All files must be images' };
    }

    // Check file sizes
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return { isValid: false, error: 'All images must be less than 10MB' };
    }

    return { isValid: true };
  }
}

export default PhotoProcessor;