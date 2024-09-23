import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const client = await pool.connect();
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("Error: User ID is required");
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const threadsResponse = await client.query(`
      SELECT ut.thread_id, ut.title, 
             COALESCE(ta.keywords, '[]') AS keywords, 
             COALESCE(ta.topics, '[]') AS topics, 
             COALESCE(ta.summary, '') AS summary,
             ut.last_active
      FROM user_threads ut
      LEFT JOIN thread_analysis ta ON ut.thread_id = ta.thread_id
      WHERE ut.user_id = $1`,
      [userId]
    );

    // Extract the rows from the response
    const threads = threadsResponse.rows;

    // Log the extracted rows
    console.log('Extracted threads:', threads);

    return NextResponse.json({ threads });
  } catch (error) {
    console.error('Error: Failed to fetch threads:', error);
    return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const client = await pool.connect();
  const { threadId } = await request.json();

  if (!threadId) {
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  try {
    await client.query(`
      UPDATE user_threads
      SET last_active = NOW()
      WHERE thread_id = $1`,
      [threadId]
    );

    return NextResponse.json({ message: 'Thread last_active updated successfully' });
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json({ error: 'Failed to update thread' }, { status: 500 });
  } finally {
    client.release();
  }
}
