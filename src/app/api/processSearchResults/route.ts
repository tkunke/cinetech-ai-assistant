import { NextRequest, NextResponse } from 'next/server';
import { processSearchResults } from '@/utils/processSearchResults';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { user_request, search_results } = await req.json();

    const analysis = await processSearchResults(user_request, search_results);

    // Return the analysis
    return NextResponse.json({ analysis }, { status: 200 });
  } catch (error: any) {
    console.error('Error during processing search results:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
