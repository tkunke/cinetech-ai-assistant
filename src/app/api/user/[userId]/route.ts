import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  const client = await pool.connect();  // Await the connection
  try {
    const userQuery = await client.query(`SELECT * FROM users WHERE id = $1`, [params.userId]);
    const user = userQuery.rows[0];

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ message: 'Error fetching user' }, { status: 500 });
  } finally {
    client.release();  // Release the connection
  }
}

export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  const client = await pool.connect();  // Await the connection
  try {
    const userData = await request.json();
    const { firstName, lastName, email, username, assistantName, credits } = userData;

    // Update user data in the database
    await client.query(`
      UPDATE users
      SET
        first_name = $1,
        last_name = $2,
        email = $3,
        username = $4,
        assistant_name = $5,
        credits = $6
      WHERE id = $7`,
      [firstName, lastName, email, username, assistantName, credits, params.userId]
    );

    return NextResponse.json({ message: 'User data saved successfully!' });
  } catch (error) {
    console.error('Error saving user data:', error);
    return NextResponse.json({ message: 'Error saving user data' }, { status: 500 });
  } finally {
    client.release();  // Release the connection
  }
}
