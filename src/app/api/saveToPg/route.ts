import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    console.log('Parsed request body:', requestBody);

    const { userId, threadId, title, type } = requestBody;

    if (!userId || !threadId || !type) {
      throw new Error('User ID, thread ID, or type is missing');
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    if (type === 'thread') {
      await sql`
        INSERT INTO user_threads (id, user_id, thread_id, title, created_at)
        VALUES (${id}, ${userId}, ${threadId}, ${title}, ${createdAt})
      `;
      console.log('Thread metadata saved successfully in SQL database');
    } else if (type === 'image') {
      const imageUrl = requestBody.imageUrl;
      if (!imageUrl) throw new Error('Image URL is missing');
      
      const thumbnailUrl = imageUrl; // Use the same URL for the thumbnail
      await sql`
        INSERT INTO user_gen_images (id, user_id, image_url, created_at, thumbnail_url)
        VALUES (${id}, ${userId}, ${imageUrl}, ${createdAt}, ${thumbnailUrl})
      `;
      console.log('Image metadata saved successfully in SQL database');
    } else if (type === 'message') {
      const messageUrl = requestBody.messageUrl;
      if (!messageUrl) throw new Error('Message URL is missing');

      await sql`
        INSERT INTO user_gen_messages (id, user_id, message_url, created_at)
        VALUES (${id}, ${userId}, ${messageUrl}, ${createdAt})
      `;
      console.log('Message metadata saved successfully in SQL database');
    } else {
      throw new Error('Invalid type provided');
    }

    return NextResponse.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} metadata saved successfully` });
  } catch (error) {
    console.error('Error saving metadata:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

// DELETE method to handle the deletion of images or messages
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, contentUrl, threadId, type } = await request.json();

    if (!userId || !type) {
      throw new Error('User ID or type is missing');
    }

    if (type === 'thread') {
      if (!threadId) throw new Error('Thread ID is missing');

      await sql`
        DELETE FROM user_threads WHERE user_id = ${userId} AND thread_id = ${threadId}
      `;
      console.log('Thread metadata deleted successfully from SQL database');
    } else if (type === 'image') {
      if (!contentUrl) throw new Error('Content URL is missing');
      
      // Delete image metadata
      await sql`
        DELETE FROM user_gen_images WHERE user_id = ${userId} AND image_url = ${contentUrl}
      `;
      console.log('Image metadata deleted successfully from SQL database');
    } else if (type === 'message') {
      if (!contentUrl) throw new Error('Content URL is missing');

      // Delete message metadata
      await sql`
        DELETE FROM user_gen_messages WHERE user_id = ${userId} AND message_url = ${contentUrl}
      `;
      console.log('Message metadata deleted successfully from SQL database');
    } else {
      throw new Error('Invalid type provided');
    }

    return NextResponse.json({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} metadata deleted successfully` });
  } catch (error) {
    console.error('Error deleting metadata:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}

