import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId'); // Get the workspaceId from the query params

  if (!workspaceId) {
    console.error("Workspace ID not provided");
    return NextResponse.json({ error: "Workspace ID not provided" }, { status: 400 });
  }

  try {
    console.log("Executing query to fetch messages associated with the workspace");
    const messagesQuery = await sql`
      SELECT id, message_url
      FROM user_gen_messages
      WHERE workspace_id = ${workspaceId}
    `;

    console.log("Raw data from database:", messagesQuery.rows);

    if (!messagesQuery.rows || messagesQuery.rows.length === 0) {
      console.error("No rows returned from database");
      return NextResponse.json({ messages: [] });
    }

    const messages = messagesQuery.rows.map(message => ({
      messageUrl: message.message_url,
      messageId: message.id
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
