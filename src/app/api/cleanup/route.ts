import { NextRequest, NextResponse } from 'next/server';
import { cleanupThreadFiles } from '@/utils/fileUtils';

export async function POST(request: NextRequest) {
  try {
    await cleanupThreadFiles();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in cleanup endpoint:', error);
    return NextResponse.json({ error: 'Failed to clean up files' });
  }
}
