import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

// Handler for GET requests
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    console.log(`GET request received for userId: ${userId}`);
    const userQuery = await client.query(
      `SELECT credits FROM users WHERE id = $1`,
      [userId]
    );
    if (userQuery.rows.length === 0) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokenCount = userQuery.rows[0].credits;
    return NextResponse.json({ tokenCount });
  } catch (error) {
    console.error("Error fetching credit count:", error);
    return NextResponse.json({ error: "Failed to fetch credit count" }, { status: 500 });
  } finally {
    client.release(); // Always release the client in the finally block
  }
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  const body = await request.json();
  const userId = body.userId;
  const newCredits = body.newCredits; // The number of credits to update

  console.log(`POST request received with body: ${JSON.stringify(body)}`);

  if (!userId || newCredits === undefined) {
    console.error("Invalid request body");
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    // Use parameterized query for security (no direct interpolation)
    await client.query(
      `UPDATE users SET credits = $1 WHERE id = $2`,
      [newCredits, userId]
    );
    return NextResponse.json({ message: "Credit count updated successfully in DB" });
  } catch (error) {
    console.error("Error updating credit count:", error);
    return NextResponse.json({ error: "Failed to update credit count in DB" }, { status: 500 });
  } finally {
    client.release(); // Ensure connection release
  }
}
