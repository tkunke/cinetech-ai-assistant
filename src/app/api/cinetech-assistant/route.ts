import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';
import fs from 'fs';
import path from 'path';
import { performBingSearch } from '@/utils/performBingSearch';
import { processSearchResults } from '@/utils/processSearchResults';
import { generateImage } from '@/utils/generateImage';
import { imageRecognition } from '@/utils/imageRecognition';
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
  failed?: boolean;
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
  tools: FileSearch[] | any[]; // Allow different tool types
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

// In-memory store for temporarily stored files
interface FileStore {
  [key: string]: {
    filePath: string;
    fileType: string;
  };
}

const fileStore: FileStore = {}; // Initialize the file store

// Disable Edge Runtime
//export const runtime = 'nodejs';

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

    // Determine the appropriate tool based on the file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension && ['png', 'jpeg', 'jpg', 'webp', 'gif'].includes(fileExtension)) {
      // Save the file temporarily to disk for later use
      const filePath = `/tmp/${file.name}`;
      fs.writeFileSync(filePath, fileBuffer);
      fileStore[threadId || ''] = { filePath, fileType: file.type };
    }
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

  // Function to cancel a run
  async function cancelRun(threadId: string, runId: string) {
    const openai = new OpenAI();
    try {
      await openai.beta.threads.runs.cancel(threadId, runId);
      console.log(`Run ${runId} cancelled successfully for thread ${threadId}`);
    } catch (error) {
      console.error(`Failed to cancel run ${runId} for thread ${threadId}:`, error);
    }
  }

  const MAX_ATTEMPTS = 3;

  // Polling function to check run status
  async function pollRunStatus(assistantStream: AssistantStream) {
    let runStatus: OpenAI.Beta.Threads.Runs.Run | undefined;
    let runId: string | undefined;
    let isCompleted = false;
    let emptyToolOutputAttempts = 0; // Counter for attempts with no tool outputs
  
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
        const toolOutputs: { tool_call_id: string; output: string | undefined; }[] = [];
  
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let output: string | undefined;
          let attemptCount = 0; // Initialize the attempt counter for each tool call
  
          while (attemptCount < MAX_ATTEMPTS) {
            try {
              console.log(`Attempting ${functionName}, attempt ${attemptCount + 1}`);
              if (functionName === 'performBingSearch') {
                const searchResults = await performBingSearch(args.user_request);
                const searchResultsString = JSON.stringify(searchResults);
                console.log('Search results string:', searchResultsString);
                output = await processSearchResults(args.user_request, searchResultsString);
                console.log('Processed search results output:', output);
              } else if (functionName === 'generateImage') {
                const imageUrl = await generateImage(args.content);
                output = imageUrl ?? undefined;
              } else if (functionName === 'imageRecognition') {
                // Check if the file is stored for image recognition
                const storedFile = fileStore[runStatus.thread_id];
                if (storedFile) {
                  const { filePath, fileType } = storedFile;
                  const imageRecognitionResponse = await imageRecognition(filePath, args.content);
                  output = imageRecognitionResponse ?? undefined;
                  // Clean up the temporary file after use
                  fs.unlinkSync(filePath);
                  delete fileStore[runStatus.thread_id];
                } else {
                  console.error('No file provided for image recognition');
                  output = undefined;
                }
              }
  
              if (output !== undefined) {
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: output,
                });
              }
  
              console.log(`Function ${functionName} completed successfully.`);
              break; // Break out of the retry loop if successful
  
            } catch (error) {
              attemptCount++;
              console.error(`Attempt ${attemptCount} failed for ${functionName}:`, error);
              if (attemptCount >= MAX_ATTEMPTS) {
                console.log('Maximum attempts reached for function call. Stopping further attempts.');
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay before retrying
            }
          }
  
          if (attemptCount >= MAX_ATTEMPTS && output === undefined) {
            emptyToolOutputAttempts++;
          }
        }
  
        // Ensure we only submit tool outputs if there are any valid outputs
        if (toolOutputs.length > 0) {
          console.log('Submitting tool outputs:', toolOutputs, 'Thread ID:', runStatus.thread_id);
          await openai.beta.threads.runs.submitToolOutputsStream(runStatus.thread_id, runStatus.id, {
            tool_outputs: toolOutputs,
          });
          console.log('Tool outputs submitted for thread ID:', runStatus.thread_id);
        } else {
          console.log('No tool outputs to submit.');
          emptyToolOutputAttempts++;
        }
  
        // Retrieve the latest run status using runId
        runStatus = await openai.beta.threads.runs.retrieve(runStatus.thread_id, runId!);
        //console.log('Run status retrieved:', runStatus);
  
        // Check if the run status is completed and break the loop if it is
        if (runStatus.status === 'completed') {
          console.log('Run is completed after submitting tool outputs, breaking the loop.');
          isCompleted = true;
          break;
        }
  
        // Exit condition: if we have too many empty tool output attempts, exit the loop
        if (emptyToolOutputAttempts >= 3) {
          console.log('Exiting due to repeated empty tool outputs.');
          runStatusStore[runStatus.thread_id] = {
            ...runStatusStore[runStatus.thread_id],
            failed: true
          }; // Set the 'failed' flag
          if (runId) {
            await cancelRun(runStatus.thread_id, runId); // Cancel the run
          }
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
      runStatusStore[runStatus.thread_id] = {
        ...runStatus,
        failed: runStatusStore[runStatus.thread_id]?.failed || false,
      };
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