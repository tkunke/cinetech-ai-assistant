import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    console.log('Parsed request body:', requestBody);

    const { userId, imageUrl, messageUrl, type } = requestBody;

    if (!userId || (!imageUrl && !messageUrl)) {
      throw new Error('User ID or content URL is missing');
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    if (type === 'image') {
      const thumbnailUrl = imageUrl; // Use the same URL for the thumbnail
      await sql`
        INSERT INTO user_gen_images (id, user_id, image_url, created_at, thumbnail_url)
        VALUES (${id}, ${userId}, ${imageUrl}, ${createdAt}, ${thumbnailUrl})
      `;
      console.log('Image metadata saved successfully in SQL database');
    } else if (type === 'message') {
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
