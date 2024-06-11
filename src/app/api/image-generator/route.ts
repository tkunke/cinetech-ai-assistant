import { NextRequest, NextResponse } from 'next/server';
import { generateImage } from '@/utils/generateImage';

// This enables Edge Functions in Vercel
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  console.log('Received request:', req.method);

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return NextResponse.json({ message: 'Only POST requests are allowed' }, { status: 405 });
  }

  try {
    const { content } = await req.json(); // Read the 'content' field from the request body
    console.log('Prompt:', content);

    if (!content) {
      console.log('No prompt provided');
      return NextResponse.json({ message: 'Prompt is required' }, { status: 400 });
    }

    const url = await generateImage(content);
    if (url) {
      console.log('Generated image URL:', url);
      return NextResponse.json({ url }, { status: 200 });
    } else {
      console.log('No data found in the response');
      return NextResponse.json({ message: 'No data found in the response' }, { status: 500 });
    }
  } catch (err) {
    console.log('Error generating image:', err);
    if (err instanceof Error) {
      return NextResponse.json({ message: 'Error generating image', error: err.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'An unknown error occurred' }, { status: 500 });
    }
  }
}
