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
    const result = await client.query('SELECT openai_assistant FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Assistant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, assistantId: result.rows[0].openai_assistant });
  } catch (error) {
    console.error('Error fetching assistant ID:', error);
    return NextResponse.json({ success: false, error: 'Error fetching assistant ID' }, { status: 500 });
  } finally {
    client.release();
  }
}
