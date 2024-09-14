import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
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
      const messageTagsQuery = await client.query(
        `SELECT * FROM project_tag_messages WHERE message_id = $1`,
        [messageId]
      );
      if (messageTagsQuery?.rowCount && messageTagsQuery.rowCount > 0) {
        response.messageTags = true;
      }
    }

    // Step 2: Check entries in project_tag_images
    if (imageId) {
      const imageTagsQuery = await client.query(
        `SELECT * FROM project_tag_images WHERE image_id = $1`,
        [imageId]
      );
      if (imageTagsQuery?.rowCount && imageTagsQuery.rowCount > 0) {
        response.imageTags = true;
      }
    }

    // Step 3: Check entries in project_tag_files
    if (fileId) {
      const fileTagsQuery = await client.query(
        `SELECT * FROM project_tag_files WHERE file_id = $1`,
        [fileId]
      );
      if (fileTagsQuery?.rowCount && fileTagsQuery.rowCount > 0) {
        response.fileTags = true;
      }
    }

    // Step 4: Check entries in project_tag_uploaded_files
    if (fileId) {
      const uploadedFileTagsQuery = await client.query(
        `SELECT * FROM project_tag_uploaded_files WHERE file_id = $1`,
        [fileId]
      );
      if (uploadedFileTagsQuery?.rowCount && uploadedFileTagsQuery.rowCount > 0) {
        response.uploadedFileTags = true;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking tags in join tables:', error);
    return NextResponse.json({ error: 'Failed to check tags in join tables' }, { status: 500 });
  } finally {
    client.release();
  }
}
