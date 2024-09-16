import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const username = searchParams.get('username');  // Check for username
  const userId = searchParams.get('userId');
  const details = searchParams.get('details') === 'true'; // Check for details param

  if (!email && !username && !userId) {
    return NextResponse.json({ message: 'Email, Username, or User ID is required' }, { status: 400 });
  }

  try {
    let userQuery;

    // Query by email, username, or userId if provided
    if (email) {
      userQuery = await client.query(
        `SELECT id, username
        FROM users
        WHERE email = $1`,
        [email]
      );
    } else if (username) {  // Check for username
      userQuery = await client.query(
        `SELECT id, username
        FROM users
        WHERE username = $1`,
        [username]
      );
    } else if (userId) {
      if (details) {
        // Return detailed information if requested
        userQuery = await client.query(
          `SELECT id, username, trial_start_date, credits, status
          FROM users
          WHERE id = $1`,
          [userId]
        );
      } else {
        // Only check if the user exists and return basic information
        userQuery = await client.query(
          `SELECT id, username
          FROM users
          WHERE id = $1`,
          [userId]
        );
      }
    }

    if (!userQuery || userQuery.rows.length === 0) {
      return NextResponse.json({ exists: false });
    }

    const user = userQuery.rows[0];
    console.log('User found:', user);

    // Return more detailed user information if requested
    if (details) {
      return NextResponse.json({
        exists: true,
        username: user.username,
        credits: user.credits,
        trialExpired: checkIfTrialExpired(user.trial_start_date), // Add your own logic here
        status: user.status,
      });
    }

    // Return the username for validation
    return NextResponse.json({
      exists: true,
      username: user.username,  // Return the username for validation
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ message: 'Error checking user status' }, { status: 500 });
  } finally {
    client.release();
  }
}

// Add a helper function to check trial expiration based on your logic
function checkIfTrialExpired(trialStartDate: string): boolean {
  const trialPeriodDays = 7; // Example: 30 days trial
  const trialEndDate = new Date(trialStartDate);
  trialEndDate.setDate(trialEndDate.getDate() + trialPeriodDays);
  return new Date() > trialEndDate;
}
