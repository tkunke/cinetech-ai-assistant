// /src/app/api/cancel-run.ts

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';

// Function to cancel a run
async function cancelRun(threadId: string, runId: string) {
  const openai = new OpenAI();
  try {
    await openai.beta.threads.runs.cancel(threadId, runId);
    console.log(`Run ${runId} cancelled successfully for thread ${threadId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to cancel run ${runId} for thread ${threadId}:`, error);
    return { success: false, error: error.message };
  }
}

export async function POST(request: NextRequest) {
  const { threadId, runId } = await request.json();

  if (!threadId || !runId) {
    return NextResponse.json({ success: false, error: 'Missing threadId or runId' });
  }

  const result = await cancelRun(threadId, runId);
  return NextResponse.json(result);
}
