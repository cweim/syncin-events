// src/app/api/reels/generate/route.ts
// RunwayML API integration for AI reel generation

import { NextRequest, NextResponse } from 'next/server';

interface ReelGenerationRequest {
  photoUrls: string[];
  style: 'trendy' | 'elegant' | 'energetic';
  duration: 5 | 10;
  eventId: string;
  userId: string;
}


// Style-specific prompts for RunwayML
const STYLE_PROMPTS = {
  trendy: "Create a modern, upbeat video reel with quick cuts, smooth zoom transitions, and contemporary effects. Add subtle motion blur and dynamic pacing perfect for social media.",
  elegant: "Generate an elegant, sophisticated video with smooth fade transitions, gentle movements, and refined pacing. Use soft lighting effects and graceful camera movements.",
  energetic: "Create a high-energy, dynamic video with fast-paced cuts, zoom effects, and vibrant transitions. Add motion graphics and rhythmic pacing for maximum engagement."
};

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ReelGenerationRequest = await request.json();
    const { photoUrls, style, duration } = body;

    // Validate input
    if (!photoUrls || photoUrls.length < 3 || photoUrls.length > 10) {
      return NextResponse.json(
        { error: 'Photo count must be between 3 and 10' },
        { status: 400 }
      );
    }

    if (!['trendy', 'elegant', 'energetic'].includes(style)) {
      return NextResponse.json(
        { error: 'Invalid style. Must be trendy, elegant, or energetic' },
        { status: 400 }
      );
    }

    if (!([5, 10] as const).includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be 5 or 10 seconds' },
        { status: 400 }
      );
    }

    // Check for RunwayML API key
    const runwayApiKey = process.env.RUNWAYML_API_KEY;
    if (!runwayApiKey) {
      console.error('RunwayML API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Step 1: Create RunwayML generation task
    const generationResponse = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify({
        model: 'gen4_turbo',
        promptImage: photoUrls[0], // Start with first image
        promptText: `${STYLE_PROMPTS[style]} Duration: ${duration} seconds. Seamlessly transition between ${photoUrls.length} photos creating a cohesive story.`,
        duration: duration,
        ratio: '720:1280' // Instagram Reels format (9:16)
      })
    });

    if (!generationResponse.ok) {
      const errorData = await generationResponse.text();
      console.error('RunwayML API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to start AI generation' },
        { status: 500 }
      );
    }

    const generationData = await generationResponse.json();
    
    // Step 2: For multi-image reels, we'll need to create segments and stitch them
    const taskId = generationData.id;
    
    // Return the task ID for progress tracking
    return NextResponse.json({
      taskId,
      status: 'pending',
      message: 'Reel generation started',
      estimatedTime: duration <= 5 ? '1-2 minutes' : '2-3 minutes'
    });

  } catch (error) {
    console.error('Error generating reel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for checking generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const runwayApiKey = process.env.RUNWAYML_API_KEY;
    if (!runwayApiKey) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    // Check task status with RunwayML
    const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      }
    });

    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to check generation status' },
        { status: 500 }
      );
    }

    const statusData = await statusResponse.json();
    
    // Map RunwayML status to our format
    let progress = 0;
    switch (statusData.status) {
      case 'PENDING':
        progress = 10;
        break;
      case 'RUNNING':
        progress = statusData.progress ? Math.round(statusData.progress * 100) : 50;
        break;
      case 'SUCCEEDED':
        progress = 100;
        break;
      case 'FAILED':
        progress = 0;
        break;
    }

    return NextResponse.json({
      taskId,
      status: statusData.status.toLowerCase(),
      progress,
      videoUrl: statusData.status === 'SUCCEEDED' ? statusData.output?.[0] : undefined,
      error: statusData.status === 'FAILED' ? statusData.failure_reason : undefined
    });

  } catch (error) {
    console.error('Error checking reel status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}