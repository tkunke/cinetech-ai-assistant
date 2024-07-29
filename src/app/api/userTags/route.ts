import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Handler for GET requests to fetch user tags and images
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    console.error("User ID not provided");
    return NextResponse.json({ error: "User ID not provided" }, { status: 400 });
  }

  try {
    console.log(`Fetching tags and images for user: ${userId}`);
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let userData;
    if (typeof user === 'string') {
      userData = JSON.parse(user);
    } else {
      userData = user;
    }

    const tags = userData.tags || [];
    const images = userData.images || [];
    return NextResponse.json({ tags, images });
  } catch (error) {
    console.error("Error fetching tags and images:", error);
    return NextResponse.json({ error: "Failed to fetch tags and images" }, { status: 500 });
  }
}

// Handler for POST requests to add a new tag to an image
export async function POST(request: NextRequest) {
  const body = await request.json();
  const userId = body.userId;
  const imageUrl = body.imageUrl;
  const newTag = body.tag;

  if (!userId || !imageUrl || !newTag) {
    console.error("Invalid request body");
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    console.log(`Fetching user data for ID: ${userId}`);
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let userData;
    if (typeof user === 'string') {
      userData = JSON.parse(user);
    } else {
      userData = user;
    }

    // Initialize images array if it doesn't exist
    if (!userData.images) {
      userData.images = [];
    }

    // Find the image and add the new tag
    const imageIndex = userData.images.findIndex((img: any) => img.imageUrl === imageUrl);
    if (imageIndex >= 0) {
      userData.images[imageIndex].tags = userData.images[imageIndex].tags || [];
      userData.images[imageIndex].tags.push(newTag);
    } else {
      // If the image does not exist, add it with the new tag
      userData.images.push({ imageUrl, tags: [newTag] });
    }

    // Save the updated user data back to the KV store
    await kv.set(`user:${userId}`, JSON.stringify(userData));
    console.log(`New tag added for image ${imageUrl} for user ${userId}:`, newTag);
    return NextResponse.json({ images: userData.images });
  } catch (error) {
    console.error("Error updating tags:", error);
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
  }
}
