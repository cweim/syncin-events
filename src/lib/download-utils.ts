// src/lib/download-utils.ts
// Version: 1.0 - Utility functions for downloading images from Firebase Storage

import { Post } from '@/types';

// ✅ Main download function that handles Firebase Storage CORS issues
export const downloadPhoto = async (imageUrl: string, filename: string = 'photo.jpg'): Promise<void> => {
  try {
    console.log('📥 Attempting to download:', filename);
    
    // Method 1: Try direct download first (works in production)
    try {
      const response = await fetch(imageUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'omit',
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
        console.log('✅ Photo downloaded successfully:', filename);
        return;
      }
    } catch (corsError) {
      console.log('🔄 Direct download failed, trying alternative method...');
    }
    
    // Method 2: Alternative approach for localhost/development
    // Create a temporary link that opens in new tab (user can save from there)
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // For better UX, we can copy the URL to clipboard as backup
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(imageUrl);
      console.log('📋 Image URL copied to clipboard as backup');
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show user-friendly message
    alert('Image opened in new tab. Right-click and "Save Image As..." to download. URL has been copied to clipboard as backup.');
    
  } catch (error) {
    console.error('❌ Error downloading photo:', error);
    
    // Fallback: Copy URL to clipboard
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(imageUrl);
        alert('Unable to download directly. Image URL copied to clipboard - you can paste it in a new tab to view/save the image.');
      } else {
        // Final fallback: show URL in prompt for manual copy
        prompt('Unable to download directly. Copy this URL to view/save the image:', imageUrl);
      }
    } catch (clipboardError) {
      console.error('Clipboard access failed:', clipboardError);
      prompt('Unable to download directly. Copy this URL to view/save the image:', imageUrl);
    }
  }
};

// ✅ Batch download function with progress tracking
export const downloadAllPhotos = async (
  posts: Post[], 
  eventTitle: string, 
  selectedPosts?: Set<string>,
  onProgress?: (completed: number, total: number) => void
): Promise<{ successCount: number; failCount: number }> => {
  const postsToDownload = selectedPosts && selectedPosts.size > 0 
    ? posts.filter(post => selectedPosts.has(post.id))
    : posts;

  if (postsToDownload.length === 0) {
    alert('No photos to download.');
    return { successCount: 0, failCount: 0 };
  }

  console.log(`📥 Starting download of ${postsToDownload.length} photos...`);
  
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  
  // Clean event title for filename
  const cleanEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
  
  try {
    for (let i = 0; i < postsToDownload.length; i++) {
      const post = postsToDownload[i];
      const filename = `${cleanEventTitle}-photo-${i + 1}-${post.id}.jpg`;
      
      try {
        await downloadPhoto(post.imageUrl, filename);
        successCount++;
        console.log(`✅ Downloaded ${i + 1}/${postsToDownload.length}: ${filename}`);
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(i + 1, postsToDownload.length);
        }
      } catch (error) {
        failCount++;
        console.error(`❌ Failed to download ${filename}:`, error);
      }
      
      // Add delay between downloads to prevent overwhelming the browser/server
      if (i < postsToDownload.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`📊 Download complete: ${successCount} successful, ${failCount} failed in ${duration}s`);
    
    // Show summary to user
    if (failCount === 0) {
      alert(`✅ Successfully downloaded all ${successCount} photos!`);
    } else {
      alert(`📊 Download complete!\n✅ Successful: ${successCount}\n❌ Failed: ${failCount}\n\nCheck console for details on failed downloads.`);
    }
    
    return { successCount, failCount };
    
  } catch (error) {
    console.error('❌ Error during batch download:', error);
    alert('An error occurred during batch download. Please try downloading individual photos.');
    return { successCount, failCount };
  }
};

// ✅ Generate a safe filename from post data
export const generatePhotoFilename = (post: Post, eventTitle: string, index?: number): string => {
  const cleanEventTitle = eventTitle.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
  const timestamp = new Date(post.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
  const indexStr = index !== undefined ? `-${index + 1}` : '';
  
  return `${cleanEventTitle}${indexStr}-${timestamp}-${post.id}.jpg`;
};

// ✅ Download photos with custom naming
export const downloadPhotosWithCustomNames = async (
  posts: Post[], 
  eventTitle: string,
  selectedPosts?: Set<string>
): Promise<void> => {
  const postsToDownload = selectedPosts && selectedPosts.size > 0 
    ? posts.filter(post => selectedPosts.has(post.id))
    : posts;

  if (postsToDownload.length === 0) {
    alert('No photos to download.');
    return;
  }

  console.log(`📥 Downloading ${postsToDownload.length} photos with custom names...`);
  
  for (let i = 0; i < postsToDownload.length; i++) {
    const post = postsToDownload[i];
    const filename = generatePhotoFilename(post, eventTitle, i);
    
    try {
      await downloadPhoto(post.imageUrl, filename);
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

// ✅ Check if download is supported
export const isDownloadSupported = (): boolean => {
  return typeof window !== 'undefined' && 'document' in window;
};

// ✅ Get download format info
export const getDownloadInfo = (posts: Post[], selectedPosts?: Set<string>) => {
  const postsToDownload = selectedPosts && selectedPosts.size > 0 
    ? posts.filter(post => selectedPosts.has(post.id))
    : posts;
    
  const totalSize = postsToDownload.length;
  const estimatedTime = Math.ceil(totalSize * 1.2); // ~1.2 seconds per image
  
  return {
    count: totalSize,
    estimatedTimeSeconds: estimatedTime,
    estimatedTimeText: estimatedTime < 60 
      ? `${estimatedTime} seconds`
      : `${Math.ceil(estimatedTime / 60)} minutes`
  };
};

// ✅ Create download summary
export const createDownloadSummary = (posts: Post[], selectedPosts?: Set<string>) => {
  const info = getDownloadInfo(posts, selectedPosts);
  
  if (info.count === 0) {
    return 'No photos selected for download.';
  }
  
  return `Ready to download ${info.count} photo${info.count === 1 ? '' : 's'}. Estimated time: ${info.estimatedTimeText}.`;
};