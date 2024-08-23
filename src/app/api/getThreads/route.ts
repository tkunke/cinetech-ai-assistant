// /pages/api/getThreads.ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const threadsResponse = await sql`
      SELECT thread_id, title
      FROM user_threads
      WHERE user_id = ${userId}
    `;

    // Extract the rows from the response
    const threads = threadsResponse.rows;

    // Log the extracted rows
    console.log('Extracted threads:', threads);

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Error fetching threads:', error);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  }
}
