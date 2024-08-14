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

// DELETE method to handle the deletion of images or messages
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId, contentUrl, type } = await request.json();

    if (!userId || !contentUrl || !type) {
      throw new Error('User ID, content URL, or type is missing');
    }

    if (type === 'image') {
      // Log the intended deletion
      console.log('Attempting to delete tags associated with the image');
      
      // Log the subquery result for image ID
      const imageIdResult = await sql`
        SELECT id FROM user_gen_images WHERE user_id = ${userId} AND image_url = ${contentUrl}
      `;
      console.log('Subquery result for image ID:', imageIdResult);

      // Delete tags associated with the image
      await sql`
        DELETE FROM project_tag_images WHERE image_id = (
          SELECT id FROM user_gen_images WHERE user_id = ${userId} AND image_url = ${contentUrl}
        )
      `;
      console.log('Tags deleted successfully (if any)');

      // Log before deleting the image itself
      console.log('Attempting to delete the image metadata itself');
      
      // Delete the image metadata itself
      const deleteResult = await sql`
        DELETE FROM user_gen_images WHERE user_id = ${userId} AND image_url = ${contentUrl}
      `;
      console.log('Image metadata delete result:', deleteResult);

      console.log('Image metadata deleted successfully from SQL database');
    } else if (type === 'message') {
      // Similar logging for message deletion
      console.log('Attempting to delete tags associated with the message');
      
      const messageIdResult = await sql`
        SELECT id FROM user_gen_messages WHERE user_id = ${userId} AND message_url = ${contentUrl}
      `;
      console.log('Subquery result for message ID:', messageIdResult);

      await sql`
        DELETE FROM project_tag_messages WHERE message_id = (
          SELECT id FROM user_gen_messages WHERE user_id = ${userId} AND message_url = ${contentUrl}
        )
      `;
      console.log('Tags deleted successfully (if any)');

      console.log('Attempting to delete the message metadata itself');
      
      const deleteResult = await sql`
        DELETE FROM user_gen_messages WHERE user_id = ${userId} AND message_url = ${contentUrl}
      `;
      console.log('Message metadata delete result:', deleteResult);

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
