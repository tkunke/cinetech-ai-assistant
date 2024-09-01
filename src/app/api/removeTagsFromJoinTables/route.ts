import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, imageId, fileId } = body;

    if (!messageId && !imageId && !fileId) {
      return NextResponse.json({ error: 'No valid ID provided' }, { status: 400 });
    }

    // Prepare a response object
    const response = {
      messageTags: false,
      imageTags: false,
      fileTags: false,
      uploadedFileTags: false,
    };

    // Step 1: Check and delete entries in project_tag_messages
    if (messageId) {
      const messageTagsQuery = await sql`SELECT * FROM project_tag_messages WHERE message_id = ${messageId}`;
      if (messageTagsQuery?.rowCount && messageTagsQuery.rowCount > 0) {
        response.messageTags = true;
        await sql`DELETE FROM project_tag_messages WHERE message_id = ${messageId}`;
      }
    }

    // Step 2: Check and delete entries in project_tag_images
    if (imageId) {
      const imageTagsQuery = await sql`SELECT * FROM project_tag_images WHERE image_id = ${imageId}`;
      if (imageTagsQuery?.rowCount && imageTagsQuery.rowCount > 0) {
        response.imageTags = true;
        await sql`DELETE FROM project_tag_images WHERE image_id = ${imageId}`;
      }
    }

    // Step 3: Check and delete entries in project_tag_files
    if (fileId) {
      const fileTagsQuery = await sql`SELECT * FROM project_tag_files WHERE file_id = ${fileId}`;
      if (fileTagsQuery?.rowCount && fileTagsQuery.rowCount > 0) {
        response.fileTags = true;
        await sql`DELETE FROM project_tag_files WHERE file_id = ${fileId}`;
      }
    }

    // Step 4: Check and delete entries in project_tag_uploaded_files
    if (fileId) {
      const uploadedFileTagsQuery = await sql`SELECT * FROM project_tag_uploaded_files WHERE file_id = ${fileId}`;
      if (uploadedFileTagsQuery?.rowCount && uploadedFileTagsQuery.rowCount > 0) {
        response.uploadedFileTags = true;
        await sql`DELETE FROM project_tag_uploaded_files WHERE file_id = ${fileId}`;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error removing tags from join tables:', error);
    return NextResponse.json({ error: 'Failed to remove tags from join tables' }, { status: 500 });
  }
}
