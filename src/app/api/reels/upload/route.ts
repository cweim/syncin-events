// src/app/api/reels/upload/route.ts
// API endpoint for uploading and processing photos for reel generation

import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const eventId = formData.get('eventId') as string;
    const userId = formData.get('userId') as string;
    const files = formData.getAll('photos') as File[];

    // Validate input
    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Event ID and User ID are required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No photos provided' },
        { status: 400 }
      );
    }

    if (files.length < 3 || files.length > 10) {
      return NextResponse.json(
        { error: 'Please upload between 3 and 10 photos' },
        { status: 400 }
      );
    }

    // Process photos using server-side utilities
    const photoUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          errors.push(`File ${i + 1}: Not an image file`);
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          errors.push(`File ${i + 1}: File too large (max 10MB)`);
          continue;
        }

        // Here you would typically upload to Firebase Storage
        // For now, we'll create a mock URL structure
        const mockUrl = `https://firebasestorage.googleapis.com/v0/b/syncin-event.appspot.com/o/reels%2F${eventId}%2F${userId}%2Fphoto_${i}_${Date.now()}.jpg?alt=media&token=mock-token-${i}`;
        
        photoUrls.push(mockUrl);

      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error);
        errors.push(`File ${i + 1}: Processing failed`);
      }
    }

    // Check if we have enough valid photos
    if (photoUrls.length < 3) {
      return NextResponse.json(
        { 
          error: 'Not enough valid photos uploaded',
          details: errors
        },
        { status: 400 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      photoUrls: photoUrls,
      processedCount: photoUrls.length,
      totalCount: files.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error uploading photos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for checking upload limits and requirements
export async function GET() {
  return NextResponse.json({
    limits: {
      minPhotos: 3,
      maxPhotos: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp']
    },
    requirements: {
      aspectRatio: 'Any (will be optimized for 9:16)',
      resolution: 'Up to 1080x1920 (will be optimized)',
      quality: 'High quality recommended for best results'
    }
  });
}