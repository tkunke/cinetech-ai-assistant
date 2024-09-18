import { NextRequest, NextResponse } from 'next/server';
import { cleanupThreadFiles } from '@/utils/fileUtils';
import { deleteAssistant } from '@/utils/assistantUtils'; // Import the delete function

export async function POST(request: NextRequest) {
  try {
    await cleanupThreadFiles(); // Cleanup files
    const { assistantId } = await request.json(); // Expect assistantId to be passed in the request body

    if (assistantId) {
      await deleteAssistant(assistantId); // Delete the assistant
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return NextResponse.json({ error: 'Failed to clean up resources' });
  }
}
