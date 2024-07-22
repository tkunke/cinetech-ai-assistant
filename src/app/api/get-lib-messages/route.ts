import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is missing' }, { status: 400 });
  }

  try {
    const userMessages = await list({
      prefix: `${userId}-message-`, // Use the userId as the prefix to list the user's messages
    });

    return NextResponse.json(userMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
