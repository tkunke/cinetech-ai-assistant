import { handleUpload, type HandleUploadBody, type HandleUploadOptions, type GenerateClientTokenOptions } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const EventTypes = {
  generateClientToken: 'blob.generate-client-token',
} as const;

function isGenerateClientTokenResponse(response: any): response is { type: "blob.generate-client-token"; clientToken: string } {
  return response.type === EventTypes.generateClientToken && 'clientToken' in response;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody = await request.json();
    console.log('Parsed request body:', requestBody);

    const { pathname, type, payload } = requestBody;

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

    const options: HandleUploadOptions = {
      body: handleUploadBody,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif'],
          tokenPayload: JSON.stringify({}),
        } as Pick<GenerateClientTokenOptions, 'allowedContentTypes'>;
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {},
    };

    const jsonResponse = await handleUpload(options);

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

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const urlToDelete = searchParams.get('url');
    const userId = searchParams.get('userId');

    if (!urlToDelete || !userId) {
      throw new Error('URL to delete or User ID is missing');
    }

    // Use the del function to delete the blob from Vercel storage
    await del(urlToDelete);

    console.log(`Blob at ${urlToDelete} deleted successfully`);

    return NextResponse.json({ message: 'Blob deleted successfully' });
  } catch (error) {
    console.error('Error deleting blob:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
