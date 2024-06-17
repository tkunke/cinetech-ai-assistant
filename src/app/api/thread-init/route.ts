import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// This enables Edge Functions in Vercel
//export const runtime = 'edge';

export async function POST(request: NextRequest) {
  console.log('Thread initialization request received');

  // Create OpenAI client
  const openai = new OpenAI();

  // Parse the request form data
  const formData = await request.formData();

  // Check for file attachments
  let fileUploadResponse;
  const file = formData.get('file') as File;

  if (file) {
    // Convert File to a format acceptable by OpenAI's API
    const fileData = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileData);

    // Save the file temporarily to disk for uploading
    const filePath = path.join('/tmp', file.name);
    await writeFile(filePath, fileBuffer);

    // Use fs.createReadStream for uploading the file
    fileUploadResponse = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants',
    });

    console.log('File uploaded:', fileUploadResponse.id);

    // Remove the temporary file
    await unlink(filePath);
  }

  // Create a new thread
  const thread = await openai.beta.threads.create();
  const threadId = thread.id;

  console.log('New thread created:', threadId);

  // Return the thread ID and file ID (if applicable) to the client
  return NextResponse.json({ threadId, fileId: fileUploadResponse?.id });
}
