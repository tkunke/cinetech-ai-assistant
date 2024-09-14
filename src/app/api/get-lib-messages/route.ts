import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  const workspaceId = request.nextUrl.searchParams.get('workspaceId'); // Get the workspaceId from the query params

  if (!workspaceId) {
    console.error("Error: Workspace ID not provided");
    return NextResponse.json({ error: "Workspace ID not provided" }, { status: 400 });
  }

  try {
    console.log("Executing query to fetch messages associated with the workspace");
    const messagesQuery = await client.query(`
      SELECT id, message_url, preview, created_at
      FROM user_gen_messages
      WHERE workspace_id = $1`,
      [workspaceId]
    );

    console.log("Raw data from database:", messagesQuery.rows);

    if (!messagesQuery.rows || messagesQuery.rows.length === 0) {
      console.error("Error: No messages found for workspace");
      return NextResponse.json({ messages: [] });
    }

    const messages = messagesQuery.rows.map(message => ({
      messageUrl: message.message_url,
      messageId: message.id,
      messagePreview: message.preview,
      timestamp: message.created_at,
    }));

    const responseData = { messages };
    console.log("Response data:", responseData);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error("Error: Failed to fetch messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  } finally {
    client.release();
  }
}
