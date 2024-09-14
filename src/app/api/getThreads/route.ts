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
      SELECT thread_id, title
      FROM user_threads
      WHERE user_id = $1`,
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
