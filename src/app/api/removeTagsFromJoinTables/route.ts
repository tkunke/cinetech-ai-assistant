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

    // Start a transaction
    await client.query('BEGIN');

    // Prepare a response object
    const response = {
      messageTags: false,
      imageTags: false,
      fileTags: false,
      uploadedFileTags: false,
    };

    // Step 1: Delete entries in project_tag_messages if messageId is provided
    if (messageId) {
      const result = await client.query(
        `DELETE FROM project_tag_messages WHERE message_id = $1 RETURNING *`,
        [messageId]
      );
      if (result.rowCount && result.rowCount > 0) {
        response.messageTags = true;
      }
    }

    // Step 2: Delete entries in project_tag_images if imageId is provided
    if (imageId) {
      const result = await client.query(
        `DELETE FROM project_tag_images WHERE image_id = $1 RETURNING *`,
        [imageId]
      );
      if (result.rowCount && result.rowCount > 0) {
        response.imageTags = true;
      }
    }

    // Step 3: Delete entries in project_tag_files if fileId is provided
    if (fileId) {
      const result = await client.query(
        `DELETE FROM project_tag_files WHERE file_id = $1 RETURNING *`,
        [fileId]
      );
      if (result.rowCount && result.rowCount > 0) {
        response.fileTags = true;
      }
    }

    // Step 4: Delete entries in project_tag_uploaded_files if fileId is provided
    if (fileId) {
      const result = await client.query(
        `DELETE FROM project_tag_uploaded_files WHERE file_id = $1 RETURNING *`,
        [fileId]
      );
      if (result.rowCount && result.rowCount > 0) {
        response.uploadedFileTags = true;
      }
    }

    // Commit the transaction
    await client.query('COMMIT');

    return NextResponse.json(response);

  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error: Failed to remove tags from join tables:', error);
    return NextResponse.json({ error: 'Failed to remove tags from join tables' }, { status: 500 });
  } finally {
    client.release();
  }
}
