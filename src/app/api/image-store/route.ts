import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const EventTypes = {
  generateClientToken: 'blob.generate-client-token',
  uploadCompleted: 'blob.upload-completed',
} as const;

function isGenerateClientTokenResponse(response: any): response is { type: "blob.generate-client-token"; clientToken: string } {
  return response.type === EventTypes.generateClientToken && 'clientToken' in response;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    console.log('Parsed request body:', requestBody);

    const { pathname, type, payload, userId } = requestBody;

    const actualPathname = pathname || payload?.pathname;

    if (!actualPathname) {
      throw new Error('Pathname is missing');
    }

    const handleUploadBody: HandleUploadBody = {
      type: type || EventTypes.generateClientToken,
      payload: {
        pathname: actualPathname,
        callbackUrl: '',
        multipart: false,
        clientPayload: null,
      }
    };

    console.log('handleUploadBody:', handleUploadBody);

    const jsonResponse = await handleUpload({
      body: handleUploadBody,
      request,
      onBeforeGenerateToken: async (pathname) => {
        console.log('Generating client token for:', pathname);
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif'],
          tokenPayload: JSON.stringify({}),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed with blob:', blob);
        console.log('Token payload:', tokenPayload);

        try {
          console.log('Saving image metadata in KV database');

          // Fetch the user data from KV database
          const user = await kv.get(`user:${userId}`);
          let userData;
          if (user) {
            userData = typeof user === 'string' ? JSON.parse(user) : user;
          } else {
            userData = { images: [] };
          }

          // Add the new image with initial metadata (e.g., empty tags array)
          userData.images.push({ imageUrl: blob.url, tags: [] });

          // Save the updated user data back to the KV store
          await kv.set(`user:${userId}`, JSON.stringify(userData));
          console.log('Image metadata saved successfully in KV database');

        } catch (error) {
          console.error('Error saving image metadata:', error);
          throw new Error('Could not save image metadata');
        }
      },
    });

    console.log('jsonResponse:', jsonResponse);

    if (isGenerateClientTokenResponse(jsonResponse)) {
      return NextResponse.json({ clientToken: jsonResponse.clientToken });
    } else {
      throw new Error('Failed to generate client token');
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
