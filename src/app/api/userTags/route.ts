import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Handler for GET requests to fetch workspace-specific tags
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId');

  if (!userId || !workspaceId) {
    console.error("User ID and Workspace ID are required");
    return NextResponse.json({ error: 'User ID and Workspace ID are required' }, { status: 400 });
  }

  try {
    console.log(`Fetching tags for workspace: ${workspaceId}`);

    // Fetch tags associated with the workspace directly from project_tags
    const tagsQuery = await sql`
      SELECT id, name
      FROM project_tags
      WHERE workspace_id = ${workspaceId}
    `;

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
  try {
    const body = await request.json();
    const { userId, workspaceId, tag } = body;

    if (!userId || !workspaceId || !tag?.name) {
      console.error("User ID, Workspace ID, and Tag Name are required");
      return NextResponse.json({ error: "User ID, Workspace ID, and Tag Name are required" }, { status: 400 });
    }

    // Insert new tag into the project_tags table directly with workspace_id
    const insertTagQuery = await sql`
      INSERT INTO project_tags (user_id, name, workspace_id)
      VALUES (${userId}, ${tag.name}, ${workspaceId})
      RETURNING id, name
    `;

    const newTag = insertTagQuery.rows[0];

    console.log(`New tag created for user ${userId} and associated with workspace ${workspaceId}`, newTag);

    // Fetch updated list of tags for the workspace
    const tagsQuery = await sql`
      SELECT id, name
      FROM project_tags
      WHERE workspace_id = ${workspaceId}
    `;
    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error creating new tag:", error);
    return NextResponse.json({ error: "Failed to create new tag" }, { status: 500 });
  }
}

// Handler for DELETE requests to delete a tag
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, workspaceId, tagId } = body;

    if (!userId || !workspaceId || !tagId) {
      console.error("User ID, Workspace ID, and Tag ID are required");
      return NextResponse.json({ error: "User ID, Workspace ID, and Tag ID are required" }, { status: 400 });
    }

    // Delete associations with images and messages first
    await sql`
      DELETE FROM project_tag_images WHERE tag_id = ${tagId}
    `;
    await sql`
      DELETE FROM project_tag_messages WHERE tag_id = ${tagId}
    `;

    // Delete the tag from project_tags
    await sql`
      DELETE FROM project_tags WHERE id = ${tagId} AND workspace_id = ${workspaceId}
    `;

    // Fetch updated list of tags for the workspace
    const tagsQuery = await sql`
      SELECT id, name
      FROM project_tags
      WHERE workspace_id = ${workspaceId}
    `;
    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

// Handler for PUT requests to tag an image or a message within a workspace
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, workspaceId, imageUrl, messageUrl, tag }: { userId: string; workspaceId: string; imageUrl?: string; messageUrl?: string; tag: { id: string; name: string } } = body;

    if (!userId || !workspaceId || (!imageUrl && !messageUrl) || !tag?.id) {
      console.error("Invalid request body");
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const tagId = tag.id;

    if (imageUrl) {
      // Fetch the image ID
      const imageQuery = await sql`
        SELECT id FROM user_gen_images WHERE user_id = ${userId} AND image_url = ${imageUrl} AND workspace_id = ${workspaceId}
      `;
      const image = imageQuery.rows[0];

      if (!image) {
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
      }

      const imageId = image.id;

      // Check if the tag already exists for this image within the workspace
      const tagQuery = await sql`
        SELECT * FROM project_tag_images WHERE image_id = ${imageId} AND tag_id = ${tagId}
      `;
      const existingTag = tagQuery.rows[0];

      if (existingTag) {
        return NextResponse.json({ message: "Tag already exists for this image" }, { status: 200 });
      }

      // Insert the new tag for this image
      await sql`
        INSERT INTO project_tag_images (tag_id, image_id)
        VALUES (${tagId}, ${imageId})
      `;

      console.log(`Tag ${tagId} added to image ${imageUrl} for user ${userId} and workspace ${workspaceId}`);

      return NextResponse.json({ message: "Tag added successfully to image" });

    } else if (messageUrl) {
      // Fetch the message ID
      const messageQuery = await sql`
        SELECT id FROM user_gen_messages WHERE user_id = ${userId} AND message_url = ${messageUrl} AND workspace_id = ${workspaceId}
      `;
      const message = messageQuery.rows[0];

      if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
      }

      const messageId = message.id;

      // Check if the tag already exists for this message within the workspace
      const tagQuery = await sql`
        SELECT * FROM project_tag_messages WHERE message_id = ${messageId} AND tag_id = ${tagId}
      `;
      const existingTag = tagQuery.rows[0];

      if (existingTag) {
        return NextResponse.json({ message: "Tag already exists for this message" }, { status: 200 });
      }

      // Insert the new tag for this message
      await sql`
        INSERT INTO project_tag_messages (tag_id, message_id)
        VALUES (${tagId}, ${messageId})
      `;

      console.log(`Tag ${tagId} added to message ${messageUrl} for user ${userId} and workspace ${workspaceId}`);

      return NextResponse.json({ message: "Tag added successfully to message" });
    }

    console.error("No valid target for tagging found");
    return NextResponse.json({ error: "No valid target for tagging found" }, { status: 400 });

  } catch (error) {
    console.error("Error adding tag:", error);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

