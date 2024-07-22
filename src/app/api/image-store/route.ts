import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

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

    const { pathname, type, payload } = requestBody;

    // Check if pathname is directly in requestBody or in payload
    const actualPathname = pathname || payload?.pathname;

    if (!actualPathname) {
      throw new Error('Pathname is missing');
    }

    // Construct the HandleUploadBody
    const handleUploadBody: HandleUploadBody = {
      type: type || EventTypes.generateClientToken,
      payload: {
        pathname: actualPathname, // Use the prefixed file name
        callbackUrl: '', // your callback URL here
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
          console.log('Updating database with blob URL:', blob.url);
          // Add your database update logic here
        } catch (error) {
          console.error('Error updating user:', error);
          throw new Error('Could not update user');
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
