import { NextRequest, NextResponse } from 'next/server';
import { performBingSearch } from '../../../../utils/performBingSearch';

export async function POST(request: NextRequest) {
  try {
    const { user_request } = await request.json();
    const searchResults = await performBingSearch(user_request);
    return NextResponse.json({ searchResults });
  } catch (error: any) {
    console.error('Error in performBingSearch route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
