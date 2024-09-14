import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Uses your Supabase connection string
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const client = await pool.connect(); // Connect to the database
    const requestBody = await request.json();
    console.log('Parsed request body:', requestBody);

    const { userId, threadId, title, type, workspaceId } = requestBody;

    // Common checks for all types
    if (!userId || !type) {
      throw new Error('User ID or type is missing');
    }

    // Workspace ID is required only for images and messages
    if ((type === 'image' || type === 'message') && !workspaceId) {
      throw new Error('Workspace ID is required for images and messages');
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    let contentId: string;

    if (type === 'thread') {
      if (!threadId || !title) {
        throw new Error('Thread ID or title is missing');
      }

      // Saving the thread
      await client.query(
        'INSERT INTO user_threads (id, user_id, thread_id, title, created_at) VALUES ($1, $2, $3, $4, $5)',
        [id, userId, threadId, title, createdAt]
      );
      console.log('Thread metadata saved successfully in SQL database');
      contentId = threadId;

    } else if (type === 'image') {
      const imageUrl = requestBody.imageUrl;
      if (!imageUrl) throw new Error('Image URL is missing');

      const thumbnailUrl = imageUrl; // Use the same URL for the thumbnail
      const result = await client.query(
        'INSERT INTO user_gen_images (id, user_id, image_url, created_at, thumbnail_url, workspace_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [id, userId, imageUrl, createdAt, thumbnailUrl, workspaceId]
      );
      console.log('Image metadata saved successfully in SQL database');
      contentId = result.rows[0].id;

    } else if (type === 'message') {
      const messageUrl = requestBody.messageUrl;
      const preview = requestBody.preview;
      
      const result = await client.query(
        'INSERT INTO user_gen_messages (id, user_id, message_url, preview, created_at, workspace_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [id, userId, messageUrl, preview, createdAt, workspaceId]
      );
      console.log('Message metadata saved successfully in SQL database');
      contentId = result.rows[0].id;

    } else {
      throw new Error('Invalid type provided');
    }

    client.release(); // Release the client back to the pool
    return NextResponse.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} metadata saved successfully`, contentId });
  } catch (error) {
    console.error('Error saving metadata:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const client = await pool.connect();
    const { userId, contentUrl, threadId, type, workspaceId } = await request.json();

    if (!userId || !type || !workspaceId) {
      throw new Error('User ID, workspace ID, or type is missing');
    }

    if (type === 'thread') {
      if (!threadId) throw new Error('Thread ID is missing');

      await client.query(
        'DELETE FROM user_threads WHERE user_id = $1 AND thread_id = $2',
        [userId, threadId]
      );
      console.log('Thread metadata deleted successfully from SQL database');
    } else if (type === 'image') {
      if (!contentUrl) throw new Error('Content URL is missing');
      
      await client.query(
        'DELETE FROM user_gen_images WHERE user_id = $1 AND image_url = $2 AND workspace_id = $3',
        [userId, contentUrl, workspaceId]
      );
      console.log('Image metadata deleted successfully from SQL database');
    } else if (type === 'message') {
      if (!contentUrl) throw new Error('Content URL is missing');

      await client.query(
        'DELETE FROM user_gen_messages WHERE user_id = $1 AND message_url = $2 AND workspace_id = $3',
        [userId, contentUrl, workspaceId]
      );
      console.log('Message metadata deleted successfully from SQL database');
    } else {
      throw new Error('Invalid type provided');
    }

    client.release(); // Release the client back to the pool
    return NextResponse.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} metadata deleted successfully` });
  } catch (error) {
    console.error('Error deleting metadata:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
