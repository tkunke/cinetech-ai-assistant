// /src/app/api/cancelRun.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';

// Function to cancel a run
async function cancelRun(threadId: string, runId: string) {
  const openai = new OpenAI();
  try {
    console.log(`Attempting to cancel run ${runId} for thread ${threadId}...`);
    await openai.beta.threads.runs.cancel(threadId, runId);
    console.log(`Run ${runId} canceled successfully for thread ${threadId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to cancel run ${runId} for thread ${threadId}:`, error);
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  console.log('Received cancel run request');
  const { threadId, runId } = await request.json();

  if (!threadId || !runId) {
    console.error('Missing threadId or runId');
    return NextResponse.json({ success: false, error: 'Missing threadId or runId' });
  }

  console.log(`Canceling run with threadId: ${threadId} and runId: ${runId}`);
  const result = await cancelRun(threadId, runId);
  
  if (result.success) {
    console.log('Run cancelation was successful');
  } else {
    console.log('Run cancelation failed');
  }

  return NextResponse.json(result);
}
