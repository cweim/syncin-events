// src/app/api/reels/webhook/route.ts
// Webhook endpoint for RunwayML status updates

import { NextRequest, NextResponse } from 'next/server';

interface WebhookPayload {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress?: number;
  output?: string[];
  failure_reason?: string;
  created_at: string;
  updated_at: string;
}

interface ReelStatusUpdate {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (in production, you'd verify the signature)
    const signature = request.headers.get('x-runwayml-signature');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload: WebhookPayload = await request.json();
    
    // Validate payload
    if (!payload.id || !payload.status) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Map RunwayML status to our internal status
    const statusUpdate: ReelStatusUpdate = {
      taskId: payload.id,
      status: mapRunwayStatus(payload.status),
      progress: calculateProgress(payload.status, payload.progress),
      videoUrl: payload.output?.[0],
      error: payload.failure_reason,
      updatedAt: new Date().toISOString()
    };

    // Here you would typically:
    // 1. Update the reel status in your database
    // 2. Send real-time updates to connected clients (WebSocket/SSE)
    // 3. Trigger any post-processing workflows

    console.log('Reel status update:', statusUpdate);

    // Mock database update
    await updateReelStatus(statusUpdate);

    // Send real-time update to client (mock implementation)
    await notifyClient(statusUpdate);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper function to map RunwayML status to our internal status
function mapRunwayStatus(runwayStatus: string): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (runwayStatus) {
    case 'PENDING':
      return 'pending';
    case 'RUNNING':
      return 'processing';
    case 'SUCCEEDED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

// Helper function to calculate progress percentage
function calculateProgress(status: string, progress?: number): number {
  switch (status) {
    case 'PENDING':
      return 10;
    case 'RUNNING':
      return progress ? Math.round(progress * 100) : 50;
    case 'SUCCEEDED':
      return 100;
    case 'FAILED':
      return 0;
    default:
      return 0;
  }
}

// Mock function to update reel status in database
async function updateReelStatus(statusUpdate: ReelStatusUpdate): Promise<void> {
  // In a real implementation, you would:
  // 1. Connect to your database (Firebase, PostgreSQL, etc.)
  // 2. Update the reel record with the new status
  // 3. Store the video URL if generation is complete
  
  console.log('Database update:', statusUpdate);
  
  // Mock implementation - in production, replace with actual database call
  return Promise.resolve();
}

// Mock function to notify connected clients
async function notifyClient(statusUpdate: ReelStatusUpdate): Promise<void> {
  // In a real implementation, you would:
  // 1. Send WebSocket message to connected clients
  // 2. Use Server-Sent Events (SSE) for real-time updates
  // 3. Push notifications to mobile apps
  
  console.log('Client notification:', statusUpdate);
  
  // Mock implementation - in production, replace with actual notification system
  return Promise.resolve();
}