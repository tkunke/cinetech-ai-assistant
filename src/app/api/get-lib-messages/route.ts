import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    console.log("Executing query: SELECT * FROM user_gen_messages WHERE user_id =", userId);
    const messagesQuery = await sql`
      SELECT *
      FROM user_gen_messages
      WHERE user_id = ${userId}
    `;

    console.log("Raw data from database:", messagesQuery.rows);

    const messages = messagesQuery.rows.map(message => ({
      messageUrl: message.message_url
    }));

    const responseData = { messages: messages || [] };
    console.log("Response data:", responseData);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
