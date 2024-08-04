import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    console.log("Executing query: SELECT id, image_url, thumbnail_url FROM user_gen_images WHERE user_id =", userId);
    const imagesQuery = await sql`
      SELECT *
      FROM user_gen_images
      WHERE user_id = ${userId}
    `;

    // Log the raw output of the query
    console.log("Raw output from database query:", imagesQuery);

    if (!imagesQuery.rows || imagesQuery.rows.length === 0) {
      console.error("No rows returned from database");
      return NextResponse.json({ images: [] });
    }

    // Log the raw data from the query
    console.log("Raw data from database:", imagesQuery.rows);

    const images = imagesQuery.rows.map(image => ({
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
