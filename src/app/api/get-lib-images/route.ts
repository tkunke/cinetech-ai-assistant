import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const workspaceId = request.nextUrl.searchParams.get('workspaceId'); // Get the workspaceId from the query params

  if (!userId || !workspaceId) {
    console.error("User ID or Workspace ID not provided");
    return NextResponse.json({ error: "User ID or Workspace ID not provided" }, { status: 400 });
  }

  try {
    console.log("Executing query to fetch images associated with the workspace");
    const imagesQuery = await sql`
      SELECT id, image_url, thumbnail_url
      FROM user_gen_images
      WHERE user_id = ${userId} AND workspace_id = ${workspaceId}
    `;

    console.log("Raw output from database query:", imagesQuery);

    if (!imagesQuery.rows || imagesQuery.rows.length === 0) {
      console.error("No rows returned from database");
      return NextResponse.json({ images: [] });
    }

    const images = imagesQuery.rows.map(image => ({
      imageId: image.id,
      imageUrl: image.image_url,
      thumbnailUrl: image.thumbnail_url
    }));

    console.log("Processed images array:", images);

    const responseData = { images: images || [] };
    console.log("Response data:", responseData);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
