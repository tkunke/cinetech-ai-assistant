import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const tag = request.nextUrl.searchParams.get('tag');

  if (!userId || !tag) {
    console.error("User ID and tag are required");
    return NextResponse.json({ error: 'User ID and tag are required' }, { status: 400 });
  }

  try {
    console.log(`Fetching objects for user: ${userId} with tag: ${tag}`);
    const user = await kv.get(`user:${userId}`);
    if (!user) {
      console.error("User not found");
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let userData;
    if (typeof user === 'string') {
      userData = JSON.parse(user);
    } else {
      userData = user;
    }

    console.log("User data:", JSON.stringify(userData, null, 2));

    const images = userData.images || [];
    const filteredImages = images.filter((img: any) => img.tags && img.tags.some((t: any) => t.name === tag));

    console.log("Filtered images:", filteredImages);

    return NextResponse.json({ images: filteredImages });
  } catch (error) {
    console.error('Error fetching objects:', error);
    return NextResponse.json({ error: 'Failed to fetch objects' }, { status: 500 });
  }
}
