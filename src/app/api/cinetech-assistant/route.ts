import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';
import fs from 'fs';
import path from 'path';
import { performBingSearch } from '@/utils/performBingSearch';
import { processSearchResults } from '@/utils/processSearchResults';
import { generateImage } from '@/utils/generateImage';
import { AssistantStream } from 'openai/lib/AssistantStream';

// Define the RunStatus type
interface RunStatus {
  status: string;
  required_action?: {
    submit_tool_outputs: {
      tool_calls: ToolCall[];
    };
  } | null; // Allow null for compatibility
  thread_id: string;
  id: string;
}

// Define the ToolCall type (ensure this matches your actual type)
interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

type TextContent = {
  type: 'text';
  text: {
    value: string;
  };
};

type ImageContent = {
  type: 'image_file' | 'image_url';
  image: {
    url: string;
  };
};

type MessageContent = TextContent | ImageContent;

// Define the MessageCreateParams type
interface FileSearch {
  type: 'file_search';
}

interface Attachment {
  file_id: string;
  tools: FileSearch[];
}

interface MessageCreateParams {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

// In-memory store for run statuses
interface RunStatusStore {
  [key: string]: RunStatus; // Define the type of the store
}

const runStatusStore: RunStatusStore = {}; // Initialize the store with the proper type

// Disable Edge Runtime
export const config = {
  runtime: 'nodejs',
};

// Post a new message and stream OpenAI Assistant response
export async function POST(request: NextRequest) {
  console.log('POST request received');

  // Create OpenAI client
  const openai = new OpenAI();

  // Parse form data for file attachments
  const formData = await request.formData();
  const content = formData.get('content') as string;
  const assistantId = formData.get('assistantId') as string;
  let threadId = formData.get('threadId') as string | null;
  const file = formData.get('file') as File | null;

  // Define newMessage with proper typing
  let newMessage: MessageCreateParams = {
    role: 'user',
    content,
    attachments: [],
  };

  // Handle file upload if there's a file attached
  if (file) {
    const fileData = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileData);

    // Save the file temporarily to disk for uploading
    const filePath = `/tmp/${file.name}`;
    fs.writeFileSync(filePath, fileBuffer);

    const fileUploadResponse = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants',
    });

    console.log('File uploaded:', fileUploadResponse.id);

    // Remove the temporary file
    fs.unlinkSync(filePath);

    // Add the file attachment to the new message
    newMessage.attachments = [{ file_id: fileUploadResponse.id, tools: [{ type: 'file_search' }] }];
  }

  // If no thread id then create a new openai thread
  if (!threadId) {
    console.log('Creating a new thread');
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
  }
  console.log('Thread ID:', threadId);

  // Add new message to thread
  console.log('Message to be added to thread:', JSON.stringify(newMessage, null, 2));
  await openai.beta.threads.messages.create(threadId, newMessage);
  console.log('Message added to thread', newMessage);

  // Create a run and stream it
  const runStream = openai.beta.threads.runs.stream(threadId, {
    assistant_id: assistantId,
  });

  const assistantStream = runStream; // Use runStream directly if it supports the necessary methods
  const readableStream = runStream.toReadableStream();
  console.log('Readable stream created');

  // Polling function to check run status
  async function pollRunStatus(assistantStream: AssistantStream) {
    let runStatus: OpenAI.Beta.Threads.Runs.Run | undefined;
    let runId: string | undefined;
    let isCompleted = false;

    // Wait for the initial run status to be available
    while (!runStatus) {
      runStatus = assistantStream.currentRun();
      if (runStatus) {
        runId = runStatus.id;
      } else {
        console.log('Current run is undefined, retrying...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Initial run status:', runStatus);

    while (!isCompleted) {
      console.log('Current run status:', runStatus?.status, 'Thread ID:', runStatus?.thread_id);

      if (runStatus?.status === 'requires_action' && runStatus.required_action) {
        console.log('Action required. Processing tool calls.');
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let output;

          try {
            if (functionName === 'performBingSearch') {
              const searchResults = await performBingSearch(args.user_request);
              const searchResultsString = JSON.stringify(searchResults);
              console.log('Search results string:', searchResultsString);
              output = await processSearchResults(args.user_request, searchResultsString);
              console.log('Processed search results output:', output);
            } else if (functionName === 'generateImage') {
              const imageUrl = await generateImage(args.content);
              output = imageUrl ?? undefined;
            }

            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: output,
            });

            // Check the run status after processing each tool call
            runStatus = await openai.beta.threads.runs.retrieve(runStatus.thread_id, runId!);
            if (runStatus.status === 'completed') {
              console.log('Run is completed after processing tool call, breaking the loop.');
              isCompleted = true;
              break;
            }

          } catch (error) {
            console.error(`Error performing ${functionName}:`, error);
            continue;
          }
        }

        if (isCompleted) {
          break;
        }

        console.log('Submitting tool outputs:', toolOutputs, 'Thread ID:', runStatus.thread_id);
        await openai.beta.threads.runs.submitToolOutputsStream(runStatus.thread_id, runStatus.id, {
          tool_outputs: toolOutputs,
        });
        console.log('Tool outputs submitted for thread ID:', runStatus.thread_id);

        // Retrieve the latest run status using runId
        runStatus = await openai.beta.threads.runs.retrieve(runStatus.thread_id, runId!);
        console.log('Run status retrieved:', runStatus);

        // Check if the run status is completed and break the loop if it is
        if (runStatus.status === 'completed') {
          console.log('Run is completed after submitting tool outputs, breaking the loop.');
          isCompleted = true;
          break;
        }
      }

      // Implement a delay or polling mechanism to avoid too frequent requests
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch the current run status again from the assistantStream
      runStatus = assistantStream.currentRun();
      //console.log('Run status updated:', runStatus);

      // Check if the runStatus is null or undefined
      if (!runStatus) {
        console.log('Run status is no longer available. Exiting loop.');
        break;
      }

      // Break the loop if the run status is completed
      if (runStatus?.status === 'completed') {
        console.log('Run is completed in the polling loop, breaking.');
        isCompleted = true;
        break;
      }

      // Update the run status store
      if (runStatus) {
        runStatusStore[runStatus.thread_id] = runStatus;
      }
    }

    // Final update to the run status store
    if (runStatus) {
      runStatusStore[runStatus.thread_id] = runStatus;
    }

    console.log('Run completed with status:', runStatus?.status, 'Thread ID:', runStatus?.thread_id);
    return runStatus?.status === 'completed';
  }

  pollRunStatus(runStream).then((isCompleted) => {
    console.log(`Run status completed: ${isCompleted}`);
  }).catch((error) => {
    console.error('Error during polling run status:', error);
  });

  return new Response(readableStream);
}

// Get all of the OpenAI Assistant messages associated with a thread
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get('threadId');

  if (threadId == null) {
    throw Error('Missing threadId');
  }

  // Create OpenAI client
  const openai = new OpenAI();

  // Get thread and messages
  const threadMessages = await openai.beta.threads.messages.list(threadId);

  // Only transmit the data that we need
  const cleanMessages = threadMessages.data.map((m) => {
    let content = '';
    if (m.content && Array.isArray(m.content) && m.content.length > 0) {
      const messageContent = m.content[0] as MessageContent;
      if (messageContent.type === 'text') {
        content = messageContent.text.value;
      } else if (messageContent.type === 'image_file' || 'image_url') {
        content = messageContent.image.url;
      }
    }
    return {
      id: m.id,
      role: m.role,
      content: content,
      createdAt: m.created_at,
    };
  });

  // Reverse chronology
  cleanMessages.reverse();

  // Retrieve the current run status from the in-memory store
  const runStatus = runStatusStore[threadId];

  // Return back to client
  return NextResponse.json({
    messages: cleanMessages,
    runStatus: runStatus,
  });
}
