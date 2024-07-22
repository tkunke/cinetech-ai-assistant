import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
  }

  try {
    const userImages = await list({
      prefix: `${userId}-img`, // Use the userId followed by a hyphen as the prefix to list the user's images
    });

    return NextResponse.json(userImages);
  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}