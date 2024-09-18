import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

// Handler for GET requests to fetch workspace-specific tags
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');

  if (!userId || !workspaceId) {
    console.error("User ID and Workspace ID are required");
    return NextResponse.json({ error: 'User ID and Workspace ID are required' }, { status: 400 });
  }

  try {
    console.log(`Fetching tags for workspace: ${workspaceId}`);

    // Fetch tags associated with the workspace directly from project_tags
    const tagsQuery = await client.query(`
      SELECT id, name
      FROM project_tags
      WHERE workspace_id = $1`,
      [workspaceId]
    );

    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    console.log("Response data:", { tags });
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// Handler for POST requests to add a new workspace-specific tag
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { userId, workspaceId, tag } = body;

    if (!userId || !workspaceId || !tag?.name) {
      console.error("User ID, Workspace ID, and Tag Name are required");
      return NextResponse.json({ error: "User ID, Workspace ID, and Tag Name are required" }, { status: 400 });
    }

    // Insert new tag into the project_tags table directly with workspace_id
    const insertTagQuery = await client.query(`
      INSERT INTO project_tags (user_id, name, workspace_id)
      VALUES ($1, $2, $3)
      RETURNING id, name`,
      [userId, tag.name, workspaceId]
    );

    const newTag = insertTagQuery.rows[0];

    console.log(`New tag created for user ${userId} and associated with workspace ${workspaceId}`, newTag);

    // Fetch updated list of tags for the workspace
    const tagsQuery = await client.query(`
      SELECT id, name
      FROM project_tags
      WHERE workspace_id = $1`,
      [workspaceId]
    );
    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error creating new tag:", error);
    return NextResponse.json({ error: "Failed to create new tag" }, { status: 500 });
  }
}

// Handler for DELETE requests to delete a tag
export async function DELETE(request: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { userId, workspaceId, tagId } = body;

    if (!userId || !workspaceId || !tagId) {
      console.error("User ID, Workspace ID, and Tag ID are required");
      return NextResponse.json({ error: "User ID, Workspace ID, and Tag ID are required" }, { status: 400 });
    }

    // Perform batch delete for images and messages associated with the tag
    await client.query(`
      DELETE FROM project_tag_images
      WHERE tag_id = $1;
      DELETE FROM project_tag_messages
      WHERE tag_id = $1;
    `, [tagId]);

    // Delete the tag from project_tags
    await client.query(`
      DELETE FROM project_tags WHERE id = $1 AND workspace_id = $2`,
      [tagId, workspaceId]
    );

    // Fetch updated list of tags for the workspace
    const tagsQuery = await client.query(`
      SELECT id, name
      FROM project_tags
      WHERE workspace_id = $1`,
      [workspaceId]
    );
    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  } finally {
    client.release();
  }
}

// Handler for PUT requests to tag an image or a message within a workspace
export async function PUT(request: NextRequest) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start the transaction

    const body = await request.json();
    const { userId, workspaceId, imageUrl, messageUrl, tag }: { userId: string; workspaceId: string; imageUrl?: string; messageUrl?: string; tag: { id: string; name: string } } = body;

    // Validate the required fields
    if (!userId || !workspaceId || !tag?.id) {
      console.error("Invalid request body");
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const tagId = tag.id;

    // Case 1: Update the tag's name
    if (!imageUrl && !messageUrl && tag.name) {
      // Update the tag name in the database
      await client.query(
        `UPDATE project_tags SET name = $1 WHERE id = $2 AND workspace_id = $3`,
        [tag.name, tagId, workspaceId]
      );

      console.log(`Tag ${tagId} updated to name ${tag.name} for workspace ${workspaceId}`);
      await client.query('COMMIT'); // Commit the transaction

      return NextResponse.json({ message: "Tag updated successfully" });

    } else if (imageUrl) {
      // Case 2: Handle tag assignment to an image

      // Fetch the image ID
      const imageQuery = await client.query(`
        SELECT id FROM user_gen_images WHERE user_id = $1 AND image_url = $2 AND workspace_id = $3`,
        [userId, imageUrl, workspaceId]
      );
      const image = imageQuery.rows[0];

      if (!image) {
        await client.query('ROLLBACK'); // Roll back the transaction if image not found
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      const imageId = image.id;

      // Check if the tag already exists for this image within the workspace
      const tagQuery = await client.query(`
        SELECT * FROM project_tag_images WHERE image_id = $1 AND tag_id = $2`,
        [imageId, tagId]
      );
      const existingTag = tagQuery.rows[0];

      if (existingTag) {
        await client.query('ROLLBACK'); // Roll back the transaction if tag already exists
        return NextResponse.json({ message: "Tag already exists for this image" }, { status: 200 });
      }

      // Insert the new tag for this image
      await client.query(`
        INSERT INTO project_tag_images (tag_id, image_id)
        VALUES ($1, $2)`,
        [tagId, imageId]
      );

      console.log(`Tag ${tagId} added to image ${imageUrl} for user ${userId} and workspace ${workspaceId}`);
      await client.query('COMMIT'); // Commit the transaction

      return NextResponse.json({ message: "Tag added successfully to image" });

    } else if (messageUrl) {
      // Case 3: Handle tag assignment to a message

      // Fetch the message ID
      const messageQuery = await client.query(`
        SELECT id FROM user_gen_messages WHERE user_id = $1 AND message_url = $2 AND workspace_id = $3`,
        [userId, messageUrl, workspaceId]
      );
      const message = messageQuery.rows[0];

      if (!message) {
        await client.query('ROLLBACK'); // Roll back the transaction if message not found
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      const messageId = message.id;

      // Check if the tag already exists for this message within the workspace
      const tagQuery = await client.query(`
        SELECT * FROM project_tag_messages WHERE message_id = $1 AND tag_id = $2`,
        [messageId, tagId]
      );
      const existingTag = tagQuery.rows[0];

      if (existingTag) {
        await client.query('ROLLBACK'); // Roll back the transaction if tag already exists
        return NextResponse.json({ message: "Tag already exists for this message" }, { status: 200 });
      }

      // Insert the new tag for this message
      await client.query(`
        INSERT INTO project_tag_messages (tag_id, message_id)
        VALUES ($1, $2)`,
        [tagId, messageId]
      );

      console.log(`Tag ${tagId} added to message ${messageUrl} for user ${userId} and workspace ${workspaceId}`);
      await client.query('COMMIT'); // Commit the transaction

      return NextResponse.json({ message: "Tag added successfully to message" });
    }

    console.error("No valid target for tagging found");
    await client.query('ROLLBACK'); // Roll back the transaction if no valid target
    return NextResponse.json({ error: "No valid target for tagging found" }, { status: 400 });

  } catch (error) {
    await client.query('ROLLBACK'); // Roll back the transaction in case of any error
    console.error("Error handling tag:", error);
    return NextResponse.json({ error: "Failed to handle tag" }, { status: 500 });
  } finally {
    client.release(); // Always release the client after completing the request
  }
}

