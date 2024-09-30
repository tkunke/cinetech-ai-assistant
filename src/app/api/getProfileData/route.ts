import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool with Supabase connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const client = await pool.connect();
  try {
    // Assuming userId is passed as a query parameter
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Query to fetch user data from the database
    const query = `
      SELECT username, email, preferred_name, password, assistant_name, status, annual_credit_total, default_model, subscription_type
      FROM users
      WHERE id = $1
    `;

    const result = await client.query(query, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = result.rows[0];

    // Respond with the user's profile data
    return NextResponse.json({ 
      user: {
        username: userData.username,
        email: userData.email,
        preferredName: userData.preferred_name,
        password: userData.password,
        assistantName: userData.assistant_name,
        status: userData.status,
        creditAllotment: userData.annual_credit_total,
        defaultModel: userData.default_model,
        planType: userData.subscription_type,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
    const client = await pool.connect();
    try {
      const { preferredName, assistantName } = await request.json();
  
      if (!preferredName || !assistantName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
  
      // Assuming userId is part of the request (this can be adjusted to your needs)
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId');
  
      if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
      }
  
      // Update query to modify user's profile information
      const updateQuery = `
        UPDATE users
        SET preferred_name = $1, assistant_name = $2
        WHERE id = $3
      `;
  
      await client.query(updateQuery, [preferredName, assistantName, userId]);
  
      return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    } finally {
      client.release();
    }
  }
