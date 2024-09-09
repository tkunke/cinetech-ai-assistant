import { NextRequest, NextResponse } from 'next/server';
import { sql, QueryResult, QueryResultRow } from '@vercel/postgres';

// Define the shape of the image record returned from the database
interface ImageRecord {
  id: string;
  image_url: string;
  thumbnail_url: string;
}

// Define the shape of the response payload
interface ImageResponse {
  imageId: string;
  imageUrl: string;
  thumbnailUrl: string;
}

export async function GET(request: NextRequest) {
  const workspaceId = request.nextUrl.searchParams.get('workspaceId'); // Get the workspaceId from the query params

  if (!workspaceId) {
    console.error("Workspace ID not provided");
    return NextResponse.json({ error: "Workspace ID not provided" }, { status: 400 });
  }

  try {
    console.log("Executing query to fetch images associated with the workspace");

    // Execute the SQL query to fetch the images for the workspace
    const imagesQuery: QueryResult<ImageRecord> = await sql`
      SELECT id, image_url, thumbnail_url
      FROM user_gen_images
      WHERE workspace_id = ${workspaceId}
    `;

    console.log("Raw output from database query:", imagesQuery);

    // Check if no rows were returned from the query
    if (!imagesQuery.rows || imagesQuery.rows.length === 0) {
      console.error("No rows returned from database");
      return NextResponse.json({ images: [] });
    }

    // Map the database rows to the expected response structure
    const images: ImageResponse[] = imagesQuery.rows.map((image: ImageRecord) => ({
      imageId: image.id,
      imageUrl: image.image_url,
      thumbnailUrl: image.thumbnail_url,
    }));

    console.log("Processed images array:", images);

    const responseData = { images };
    console.log("Response data:", responseData);

    // Create the response with custom headers to avoid caching
    const response = NextResponse.json(responseData);
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    
    return response;
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}
