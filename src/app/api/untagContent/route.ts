import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
  });

export async function DELETE(request: NextRequest) {
    const client = await pool.connect();
    const { contentId, tagId, contentType } = await request.json();
  
    try {
      await client.query('BEGIN');
      
      if (contentType === 'image') {
        await client.query('DELETE FROM project_tag_images WHERE image_id = $1 AND tag_id = $2', [contentId, tagId]);
      } else if (contentType === 'message') {
        await client.query('DELETE FROM project_tag_messages WHERE message_id = $1 AND tag_id = $2', [contentId, tagId]);
      }
  
      await client.query('COMMIT');
      return NextResponse.json({ message: 'Content untagged successfully' }, { status: 200 });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error untagging content:', error);
      return NextResponse.json({ error: 'Failed to untag content' }, { status: 500 });
    } finally {
      client.release();
    }
  }
  