import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Handler for GET requests
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    console.log(`GET request received for userId: ${userId}`);
    const userQuery = await sql`SELECT credits FROM users WHERE id = ${userId}`;
    if (userQuery.rows.length === 0) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const tokenCount = userQuery.rows[0].credits;
    return NextResponse.json({ tokenCount });
  } catch (error) {
    console.error("Error fetching credit count:", error);
    return NextResponse.json({ error: "Failed to fetch credit count" }, { status: 500 });
  }
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = body.userId;
  const newCredits = body.newCredits; // Change this to reflect the actual data being passed

  console.log(`POST request received with body: ${JSON.stringify(body)}`);

  if (!userId || newCredits === undefined) {
    console.error("Invalid request body");
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await sql`UPDATE users SET credits = ${newCredits} WHERE id = ${userId}`; // Update this to newCredits
    return NextResponse.json({ message: "Credit count updated successfully in DB" });
  } catch (error) {
    console.error("Error updating credit count:", error);
    return NextResponse.json({ error: "Failed to update credit count in DB" }, { status: 500 });
  }
}
