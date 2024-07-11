import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Handler for GET requests
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    //console.log(`Fetching tokens for user: ${userId}`);
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    //console.log(`User data retrieved:`, user);
    
    // Check the type of user and parse accordingly
    let userData;
    if (typeof user === 'string') {
      userData = JSON.parse(user);
    } else {
      userData = user;
    }

    const tokenCount = userData.tokens;
    console.log(`Token count for user ${userId}: ${tokenCount}`);
    return NextResponse.json({ tokenCount });
  } catch (error) {
    console.error("Error fetching token count:", error);
    return NextResponse.json({ error: "Failed to fetch token count" }, { status: 500 });
  }
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = body.userId;
  const tokensUsed = body.tokensUsed;
  console.log('Updated token count:', tokensUsed);

  if (!userId || tokensUsed === undefined) {
    console.error("Invalid request body");
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    console.log(`Updating tokens for user: ${userId}`);
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    //console.log(`User data retrieved:`, user);

    // Check the type of user and parse accordingly
    let userData;
    if (typeof user === 'string') {
      userData = JSON.parse(user);
    } else {
      userData = user;
    }

    userData.tokens = tokensUsed; // Correctly update the tokens
    await kv.set(`user:${userId}`, JSON.stringify(userData));
    console.log(`New token count for user ${userId}: ${userData.tokens}`);
    return NextResponse.json({ newTokenCount: userData.tokens });
  } catch (error) {
    console.error("Error updating token count:", error);
    return NextResponse.json({ error: "Failed to update token count" }, { status: 500 });
  }
}