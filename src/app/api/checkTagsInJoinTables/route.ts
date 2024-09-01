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

    // Step 1: Check entries in project_tag_messages
    if (messageId) {
      const messageTagsQuery = await sql`SELECT * FROM project_tag_messages WHERE message_id = ${messageId}`;
      if (messageTagsQuery?.rowCount && messageTagsQuery.rowCount > 0) {
        response.messageTags = true;
      }
    }

    // Step 2: Check entries in project_tag_images
    if (imageId) {
      const imageTagsQuery = await sql`SELECT * FROM project_tag_images WHERE image_id = ${imageId}`;
      if (imageTagsQuery?.rowCount && imageTagsQuery.rowCount > 0) {
        response.imageTags = true;
      }
    }

    // Step 3: Check entries in project_tag_files
    if (fileId) {
      const fileTagsQuery = await sql`SELECT * FROM project_tag_files WHERE file_id = ${fileId}`;
      if (fileTagsQuery?.rowCount && fileTagsQuery.rowCount > 0) {
        response.fileTags = true;
      }
    }

    // Step 4: Check entries in project_tag_uploaded_files
    if (fileId) {
      const uploadedFileTagsQuery = await sql`SELECT * FROM project_tag_uploaded_files WHERE file_id = ${fileId}`;
      if (uploadedFileTagsQuery?.rowCount && uploadedFileTagsQuery.rowCount > 0) {
        response.uploadedFileTags = true;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking tags in join tables:', error);
    return NextResponse.json({ error: 'Failed to check tags in join tables' }, { status: 500 });
  }
}
