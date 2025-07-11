// src/lib/download-utils.ts
// Version: 1.0 - Utility functions for downloading images from Firebase Storage

import { Post } from '@/types';

// ✅ Main download function that handles Firebase Storage CORS issues for both images and videos
export const downloadMedia = async (mediaUrl: string, filename: string = 'media.jpg'): Promise<void> => {
  try {
    console.log('📥 Attempting to download:', filename);
    console.log('🔗 Media URL:', mediaUrl);
    
    // Method 1: Try direct download first (works when CORS is properly configured)
    try {
      const response = await fetch(mediaUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Accept': 'image/*,video/*,*/*',
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
        console.log('✅ Media downloaded successfully:', filename);
        return;
      } else {
        console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (corsError) {
      console.log('🔄 Direct download failed, trying alternative method...', corsError);
    }
    
    // Method 2: Use proxy/server-side download or convert to base64 (for images only)
    const isVideo = filename.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/i);
    
    if (!isVideo) {
      try {
        console.log('🔄 Trying base64 conversion method for image...');
        
        // Try to load image as base64 and download
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        const imageLoadPromise = new Promise<void>((resolve, reject) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = img.width;
              canvas.height = img.height;
              
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                  if (blob) {
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    console.log('✅ Downloaded via canvas conversion');
                    resolve();
                  } else {
                    reject(new Error('Failed to create blob'));
                  }
                }, 'image/jpeg', 0.95);
              } else {
                reject(new Error('Failed to get canvas context'));
              }
            } catch (canvasError) {
              reject(canvasError);
            }
          };
          
          img.onerror = () => reject(new Error('Failed to load image for conversion'));
        });
        
        img.src = mediaUrl;
        await imageLoadPromise;
        return;
        
      } catch (conversionError) {
        console.log('🔄 Canvas conversion failed, using fallback method...', conversionError);
      }
    } else {
      console.log('🔄 Video detected, skipping canvas conversion method...');
    }
    
    // Method 3: Final fallback - open in new tab
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Copy URL to clipboard as backup
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mediaUrl);
        console.log('📋 Media URL copied to clipboard as backup');
      }
    } catch (clipboardError) {
      console.log('📋 Clipboard not available, skipping backup');
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show user-friendly message
    const mediaType = isVideo ? 'video' : 'image';
    const saveInstructions = isVideo ? 'Save Video As...' : 'Save Image As...';
    alert(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} opened in new tab. Right-click and "${saveInstructions}" to download.`);
    
  } catch (error) {
    console.error('❌ Error downloading media:', error);
    
    // Fallback: Copy URL to clipboard or show URL
    const mediaType = filename.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/i) ? 'video' : 'image';
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(mediaUrl);
        alert(`Unable to download directly due to browser security restrictions. ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} URL copied to clipboard - paste it in a new tab to view/save the ${mediaType}.`);
      } else {
        // Final fallback: show URL in prompt for manual copy
        prompt(`Unable to download directly. Copy this URL to view/save the ${mediaType}:`, mediaUrl);
      }
    } catch (clipboardError) {
      console.log('Clipboard access failed, using prompt fallback');
      prompt(`Unable to download directly. Copy this URL to view/save the ${mediaType}:`, mediaUrl);
    }
  }
};

// ✅ Legacy function for backward compatibility
export const downloadPhoto = async (imageUrl: string, filename: string = 'photo.jpg'): Promise<void> => {
  return downloadMedia(imageUrl, filename);
};

// ✅ New function to download videos
export const downloadVideo = async (videoUrl: string, filename: string = 'video.mp4'): Promise<void> => {
  return downloadMedia(videoUrl, filename);
};

// ✅ Smart download function that detects media type and downloads accordingly
export const downloadPostMedia = async (post: Post, eventTitle: string, index?: number): Promise<void> => {
  const cleanEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
  const indexStr = index !== undefined ? `-${index + 1}` : '';
  
  if (post.mediaType === 'video' && post.videoUrl) {
    const extension = post.videoUrl.includes('.mp4') ? 'mp4' : 
                     post.videoUrl.includes('.webm') ? 'webm' : 
                     post.videoUrl.includes('.mov') ? 'mov' : 'mp4';
    const filename = `${cleanEventTitle}${indexStr}-video-${post.id}.${extension}`;
    await downloadVideo(post.videoUrl, filename);
  } else if (post.mediaType === 'image' && post.imageUrl) {
    const extension = post.imageUrl.includes('.png') ? 'png' : 
                     post.imageUrl.includes('.gif') ? 'gif' : 'jpg';
    const filename = `${cleanEventTitle}${indexStr}-photo-${post.id}.${extension}`;
    await downloadPhoto(post.imageUrl, filename);
  } else {
    throw new Error(`No ${post.mediaType} URL found for post ${post.id}`);
  }
};

// ✅ Batch download function with progress tracking (updated to support videos)
export const downloadAllMedia = async (
  posts: Post[], 
  eventTitle: string, 
  selectedPosts?: Set<string>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ successCount: number; failCount: number }> => {
  const postsToDownload = selectedPosts && selectedPosts.size > 0 
    ? posts.filter(post => selectedPosts.has(post.id))
    : posts;

  if (postsToDownload.length === 0) {
    alert('No media to download.');
    return { successCount: 0, failCount: 0 };
  }

  // Count media types
  const photoCount = postsToDownload.filter(p => p.mediaType === 'image').length;
  const videoCount = postsToDownload.filter(p => p.mediaType === 'video').length;
  console.log(`📥 Starting download of ${postsToDownload.length} items (${photoCount} photos, ${videoCount} videos)...`);
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  
  try {
    for (let i = 0; i < postsToDownload.length; i++) {
      const post = postsToDownload[i];
      
      try {
        await downloadPostMedia(post, eventTitle, i);
        successCount++;
        console.log(`✅ Downloaded ${i + 1}/${postsToDownload.length}: ${post.mediaType} ${post.id}`);
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(i + 1, postsToDownload.length);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to download ${post.mediaType} ${post.id}:`, error);
      }
      
      // Add delay between downloads to prevent overwhelming the browser/server
      if (i < postsToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`📊 Download complete: ${successCount} successful, ${failCount} failed in ${duration}s`);
    
    // Show summary to user
    const mediaText = photoCount > 0 && videoCount > 0 ? 
      `${photoCount} photo${photoCount !== 1 ? 's' : ''} and ${videoCount} video${videoCount !== 1 ? 's' : ''}` :
      photoCount > 0 ? `${photoCount} photo${photoCount !== 1 ? 's' : ''}` :
      `${videoCount} video${videoCount !== 1 ? 's' : ''}`;
    
    if (failCount === 0) {
      alert(`✅ Successfully downloaded all ${mediaText}!`);
    } else {
      alert(`📊 Download complete!\n✅ Successful: ${successCount}\n❌ Failed: ${failCount}\n\nCheck console for details on failed downloads.`);
    }
    
    return { successCount, failCount };
    
  } catch (error) {
    console.error('❌ Error during batch download:', error);
    alert('An error occurred during batch download. Please try downloading individual items.');
    return { successCount, failCount };
  }
};

// ✅ Legacy function for backward compatibility
export const downloadAllPhotos = async (
  posts: Post[], 
  eventTitle: string, 
  selectedPosts?: Set<string>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ successCount: number; failCount: number }> => {
  return downloadAllMedia(posts, eventTitle, selectedPosts, onProgress);
};

// ✅ Generate a safe filename from post data (supports both images and videos)
export const generateMediaFilename = (post: Post, eventTitle: string, index?: number): string => {
  const cleanEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
  const timestamp = new Date(post.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
  const indexStr = index !== undefined ? `-${index + 1}` : '';
  
  // Determine file extension based on media type and URL
  let extension = 'jpg'; // default
  if (post.mediaType === 'video' && post.videoUrl) {
    extension = post.videoUrl.includes('.mp4') ? 'mp4' : 
               post.videoUrl.includes('.webm') ? 'webm' : 
               post.videoUrl.includes('.mov') ? 'mov' : 'mp4';
  } else if (post.mediaType === 'image' && post.imageUrl) {
    extension = post.imageUrl.includes('.png') ? 'png' : 
               post.imageUrl.includes('.gif') ? 'gif' : 'jpg';
  }
  
  const mediaTypePrefix = post.mediaType === 'video' ? 'video' : 'photo';
  return `${cleanEventTitle}${indexStr}-${mediaTypePrefix}-${timestamp}-${post.id}.${extension}`;
};

// ✅ Legacy function for backward compatibility
export const generatePhotoFilename = (post: Post, eventTitle: string, index?: number): string => {
  return generateMediaFilename(post, eventTitle, index);
};

// ✅ Download media with custom naming (supports both images and videos)
export const downloadMediaWithCustomNames = async (
  posts: Post[], 
  eventTitle: string,
  selectedPosts?: Set<string>
): Promise<void> => {
  const postsToDownload = selectedPosts && selectedPosts.size > 0 
    ? posts.filter(post => selectedPosts.has(post.id))
    : posts;

  if (postsToDownload.length === 0) {
    alert('No media to download.');
    return;
  }

  const photoCount = postsToDownload.filter(p => p.mediaType === 'image').length;
  const videoCount = postsToDownload.filter(p => p.mediaType === 'video').length;
  console.log(`📥 Downloading ${postsToDownload.length} items (${photoCount} photos, ${videoCount} videos) with custom names...`);
  
  for (let i = 0; i < postsToDownload.length; i++) {
    const post = postsToDownload[i];
    const filename = generateMediaFilename(post, eventTitle, i);
    
    try {
      await downloadPostMedia(post, eventTitle, i);
      console.log(`✅ Downloaded: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to download ${filename}:`, error);
    }
    
    // Small delay between downloads
    if (i < postsToDownload.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
};

// ✅ Legacy function for backward compatibility
export const downloadPhotosWithCustomNames = async (
  posts: Post[], 
  eventTitle: string,
  selectedPosts?: Set<string>
): Promise<void> => {
  return downloadMediaWithCustomNames(posts, eventTitle, selectedPosts);
};

// ✅ Check if download is supported
export const isDownloadSupported = (): boolean => {
  return typeof window !== 'undefined' && 'document' in window;
};

// ✅ Get download format info (updated to account for videos taking longer)
export const getDownloadInfo = (posts: Post[], selectedPosts?: Set<string>) => {
  const postsToDownload = selectedPosts && selectedPosts.size > 0 
    ? posts.filter(post => selectedPosts.has(post.id))
    : posts;
    
  const photoCount = postsToDownload.filter(p => p.mediaType === 'image').length;
  const videoCount = postsToDownload.filter(p => p.mediaType === 'video').length;
  
  // Videos take longer to download than images
  const estimatedTime = Math.ceil(photoCount * 1.2 + videoCount * 3.0); // ~1.2s per image, ~3s per video
  
  return {
    count: postsToDownload.length,
    photoCount,
    videoCount,
    estimatedTimeSeconds: estimatedTime,
    estimatedTimeText: estimatedTime < 60 
      ? `${estimatedTime} seconds`
      : `${Math.ceil(estimatedTime / 60)} minutes`
  };
};

// ✅ Create download summary (updated for mixed media)
export const createDownloadSummary = (posts: Post[], selectedPosts?: Set<string>) => {
  const info = getDownloadInfo(posts, selectedPosts);
  
  if (info.count === 0) {
    return 'No media selected for download.';
  }
  
  let mediaText = '';
  if (info.photoCount > 0 && info.videoCount > 0) {
    mediaText = `${info.photoCount} photo${info.photoCount !== 1 ? 's' : ''} and ${info.videoCount} video${info.videoCount !== 1 ? 's' : ''}`;
  } else if (info.photoCount > 0) {
    mediaText = `${info.photoCount} photo${info.photoCount !== 1 ? 's' : ''}`;
  } else {
    mediaText = `${info.videoCount} video${info.videoCount !== 1 ? 's' : ''}`;
  }
  
  return `Ready to download ${mediaText}. Estimated time: ${info.estimatedTimeText}.`;
};