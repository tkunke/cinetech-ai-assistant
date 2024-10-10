import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use your Supabase connection string
});

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    // Query to fetch the OpenAI assistant ID from the assistant_ids JSONB column
    const result = await client.query(
      'SELECT assistant_ids->>\'openai\' AS assistant_id FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].assistant_id) {
      return NextResponse.json({ success: false, error: 'OpenAI assistant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, assistantId: result.rows[0].assistant_id });
  } catch (error) {
    console.error('Error fetching assistant ID:', error);
    return NextResponse.json({ success: false, error: 'Error fetching assistant ID' }, { status: 500 });
  } finally {
    client.release();
  }
}