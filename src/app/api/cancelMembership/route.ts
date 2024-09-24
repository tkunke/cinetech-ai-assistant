import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    // Parse the body to get the userId
    const { userId } = await request.json();
    
    // Ensure userId exists
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }
    
    // Update the user's status to 'canceled'
    await client.query(`
      UPDATE users
      SET status = 'canceled'
      WHERE id = $1`,
      [userId]
    );

    return NextResponse.json({ message: 'Membership canceled successfully!' });
  } catch (error) {
    console.error('Error canceling membership:', error);
    return NextResponse.json({ message: 'Error canceling membership' }, { status: 500 });
  } finally {
    client.release();
  }
}