import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  const userId = request.nextUrl.searchParams.get('userId');
  const tag = request.nextUrl.searchParams.get('tag');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');

  if (!userId || !tag || !workspaceId) {
    console.error("User ID, tag, and workspace ID are required");
    return NextResponse.json({ error: 'User ID, tag, and workspace ID are required' }, { status: 400 });
  }

  try {
    console.log(`Fetching objects for tag: ${tag} in workspace: ${workspaceId}`);

    // Fetch images associated with the tag and workspace
    const imagesQuery = await client.query(`
      SELECT img.image_url, img.thumbnail_url
      FROM user_gen_images img
      INNER JOIN project_tag_images pti ON img.id = pti.image_id
      WHERE pti.tag_id IN (
        SELECT id FROM project_tags WHERE name = $1 AND workspace_id = $2
      ) AND img.workspace_id = $3`,
      [tag, workspaceId, workspaceId]
    );
    
    // Fetch messages associated with the tag and workspace
    const messagesQuery = await client.query(`
      SELECT msg.message_url
      FROM user_gen_messages msg
      INNER JOIN project_tag_messages ptm ON msg.id = ptm.message_id
      WHERE ptm.tag_id IN (
        SELECT id FROM project_tags WHERE name = $1 AND workspace_id = $2
      ) AND msg.workspace_id = $3`,
      [tag, workspaceId, workspaceId]
    );

    const images = imagesQuery.rows;
    const messages = messagesQuery.rows;

    const responseData = {
      images: images || [],
      messages: messages || [],
    };

    console.log("Response data:", responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching objects:", error);
    return NextResponse.json({ error: "Failed to fetch objects" }, { status: 500 });
  } finally {
    client.release();
  }
}
