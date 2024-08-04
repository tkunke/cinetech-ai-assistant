import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Handler for GET requests to fetch user tags
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  console.log("Received GET request for userId:", userId);

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    const tagsQuery = await sql`SELECT * FROM project_tags WHERE user_id = ${userId}`;
    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    console.log("Response data:", { tags });
    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// Handler for POST requests to add a new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId;
    const tagName = body.tag?.name; // Extract the tag name from the request body

    console.log("Received POST request with body:", body);

    if (!userId || !tagName) {
      console.error("Invalid request body");
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Insert new tag into the project_tags table
    const insertTagQuery = await sql`
      INSERT INTO project_tags (user_id, name)
      VALUES (${userId}, ${tagName})
      RETURNING id, name
    `;

    const newTag = insertTagQuery.rows[0];

    console.log(`New tag created for user ${userId}`, newTag);

    // Fetch updated list of tags
    const tagsQuery = await sql`SELECT * FROM project_tags WHERE user_id = ${userId}`;
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
    const userId = body.userId;
    const tagId = body.tagId;

    console.log("Received DELETE request with body:", body);

    if (!userId || !tagId) {
      console.error("Invalid request body");
      return NextResponse.json({ error: "User ID and Tag ID are required" }, { status: 400 });
    }

    await sql`
      DELETE FROM project_tags WHERE user_id = ${userId} AND id = ${tagId}
    `;

    // Fetch updated list of tags
    const tagsQuery = await sql`SELECT * FROM project_tags WHERE user_id = ${userId}`;
    const tags = tagsQuery.rows.map(tag => ({ id: tag.id, name: tag.name }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

// Handler for PUT requests to tag an image
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, imageUrl, tag }: { userId: number; imageUrl: string; tag: { id: number; name: string } } = body;

    console.log("Received PUT request with body:", body);

    if (!userId || !imageUrl || !tag?.id) {
      console.error("Invalid request body");
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const tagId = tag.id;

    // Fetch the image ID
    const imageQuery = await sql`
      SELECT id FROM user_gen_images WHERE user_id = ${userId} AND image_url = ${imageUrl}
    `;
    const image = imageQuery.rows[0];

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const imageId = image.id;

    // Check if the tag already exists for this image
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

    console.log(`Tag ${tagId} added to image ${imageUrl} for user ${userId}`);

    return NextResponse.json({ message: "Tag added successfully" });
  } catch (error) {
    console.error("Error adding tag:", error);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}
