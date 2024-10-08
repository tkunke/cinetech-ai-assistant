import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { APIError } from 'openai/index.mjs';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { performBingSearch } from '@/utils/performBingSearch';
import { processSearchResults } from '@/utils/processSearchResults';
import { generateImage } from '@/utils/generateImage';
import { alternateImage } from '@/utils/alternateImage';
import { imageRecognition } from '@/utils/imageRecognition';
import { addFileToStore } from '@/utils/fileUtils';
import { AssistantStream } from 'openai/lib/AssistantStream';
import { Pool } from 'pg';

// Create a new connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use the Supabase connection string here
});

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string; // or Date
  metadata?: Record<string, any>;
}

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
  usage?: RunUsage | null;
  engine?: string;
}

// Define the RunUsage interface
interface RunUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Define the ToolCall type (ensure this matches your actual type)
interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

type ToolOutput = {
  tool_call_id: string;
  output: string | undefined;
  engine?: string;
  function?: {
    name: string;
    arguments: string;
  };
};

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
  metadata?: Record<string, string>;
}

// In-memory store for run statuses
interface RunStatusStore {
  [key: string]: RunStatus; // Define the type of the store
}

const runStatusStore: RunStatusStore = {}; // Initialize the store with the proper type

interface ImageEngineStore {
  [key: string]: string | undefined;
}

const imageEngineStore: ImageEngineStore = {};

// In-memory store for temporarily stored files
interface FileStore {
  [key: string]: {
    filePath: string;
    fileType: string;
  };
}

interface APIError {
  status: number;
  error?: {
    message?: string;
  };
}

const fileStore: FileStore = {}; // Initialize the file store
const threadFileStore: { [key: string]: string[] } = {};
const imageGenerationFlags: { [runId: string]: boolean } = {};

const MAX_ATTEMPTS = 3;

// Define the event handler function
async function handleRunStatusEvent(event: { status: string, threadId: string, runId: string }) {
  const { status, threadId, runId } = event;
  const openai = new OpenAI();

  //console.log(`Handling event for run status: ${status} for thread ID: ${threadId}`);

  if (status === 'completed') {
    console.log('Run is completed.');
    // Handle completion logic here
    return;
  }

  if (status === 'requires_action') {
    //console.log('Action required. Processing tool calls.');
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

    // Update the runStatusStore with the requires_action status
    runStatusStore[threadId] = {
      status: 'requires_action',
      thread_id: threadId,
      id: runId,
      required_action: runStatus.required_action,
    };

    //console.log(`runStatusStore updated for requires_action: ${JSON.stringify(runStatusStore[threadId])}`);

    if (runStatus.required_action && runStatus.required_action.submit_tool_outputs) {
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs: ToolOutput[] = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let output: string | undefined;
        let engine: string | undefined;
        let attemptCount = 0;

        while (attemptCount < MAX_ATTEMPTS) {
          try {
            if (functionName === 'performBingSearch') {
              const searchResults = await performBingSearch(args.user_request);
              const searchResultsString = JSON.stringify(searchResults);
              output = await processSearchResults(args.user_request, searchResultsString);
            } else if (functionName === 'generateImage') {
              const result = await generateImage(args.content);
              const { result: imageUrl, engine: resultEngine } = JSON.parse(result);
              output = `${imageUrl} (generated by ${resultEngine})`;
              engine = resultEngine;
              console.log(`Storing engine info in imageEngineStore: ${imageUrl} -> ${engine}`);
              imageEngineStore[imageUrl] = engine;
            } else if (functionName === 'alternateImage') {
              const result = await alternateImage(args.content);
              const { result: imageUrl, engine: resultEngine } = JSON.parse(result);
              output = `${imageUrl} (generated by ${resultEngine})`;
              engine = resultEngine;
              console.log(`Storing engine info in imageEngineStore: ${imageUrl} -> ${engine}`);
              imageEngineStore[imageUrl] = engine;
            } else if (functionName === 'imageRecognition') {
              const storedFile = fileStore[threadId];
              console.log('File store content:', storedFile); // Log file store content
              if (storedFile) {
                const { filePath, fileType } = storedFile;
                console.log(`Processing image recognition for file: ${filePath}, type: ${fileType}`);
                console.log(`Invoking imageRecognition with filePath: ${filePath} and userMessage: ${args.content}`);
                const imageRecognitionResponse = await imageRecognition(filePath, args.content);
                output = imageRecognitionResponse ?? undefined;
                fs.unlinkSync(filePath);
                delete fileStore[threadId];
              } else {
                console.error('No file provided for image recognition');
                output = undefined;
              }
            }

            if (output !== undefined) {
              const toolOutput: ToolOutput = { tool_call_id: toolCall.id, output: output };
              toolOutputs.push(toolOutput);
            }

            break;

          } catch (error) {
            attemptCount++;
            console.error(`Attempt ${attemptCount} failed for ${functionName}:`, error);
            if (attemptCount >= MAX_ATTEMPTS) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (toolOutputs.length > 0) {
        try {
            openai.beta.threads.runs.submitToolOutputsStream(threadId, runId, {
              tool_outputs: toolOutputs,
            });
    
            // Check if any of the tool calls were for image generation
            const hadImageGeneration = toolOutputs.some(output => {
              console.log('Checking tool output:', output);
              return output.output?.includes('generated by Stability AI') || output.output?.includes('generated by DALL-E');
            });
    
            if (hadImageGeneration) {
              imageGenerationFlags[runId] = true; // Mark this run as having a successful image generation
              console.log(`Image generation detected for runId ${runId}. Flag set to true.`);
            } else {
              console.log(`No image generation detected for runId ${runId}.`);
            }
        } catch (error) {
            console.error('Failed to submit tool outputs:', error);
        }
      }    
    }
  }
}

async function postTokenCost(runId: string, usage: RunUsage, imageGenerated: boolean) {
  const client = await pool.connect();
  const total_tokens = usage.prompt_tokens + usage.completion_tokens;
  const prompt_tokens_cost = (usage.prompt_tokens / 1000) * 0.005;
  const completion_tokens_cost = (usage.completion_tokens / 1000) * 0.015;
  const total_cost = prompt_tokens_cost + completion_tokens_cost;
  let total_credits = Math.floor(total_cost / 0.02);

  if (imageGenerated) {
    total_credits += 2; // Add credits if an image was generated
  }

  try {
    const query = `
      INSERT INTO token_usage (run_id, total_tokens, total_credits, prompt_tokens_cost, completion_tokens_cost, total_cost)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (run_id) DO UPDATE SET 
      total_tokens = EXCLUDED.total_tokens,
      total_credits = EXCLUDED.total_credits,
      prompt_tokens_cost = EXCLUDED.prompt_tokens_cost,
      completion_tokens_cost = EXCLUDED.completion_tokens_cost,
      total_cost = EXCLUDED.total_cost;
    `;

    await client.query(query, [runId, total_tokens, total_credits, prompt_tokens_cost, completion_tokens_cost, total_cost]);
    console.log(`Successfully updated token_usage for runId: ${runId}`); // Optional: Log success

  } catch (error) {
    console.error("Error: Failed to update token_usage:", error);
  } finally {
    client.release(); // Ensure the client is always released back to the pool
  }
}

// Simulate event subscription
async function simulateEventSubscription(threadId: string, runId: string) {
  const openai = new OpenAI();
  let finalRunStatus: RunStatus | null = null;

  // Simulate receiving events. Replace this with actual event subscription logic.
  while (true) {
    const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    await handleRunStatusEvent({
      status: runStatus.status,
      threadId: threadId,
      runId: runId,
    });

    //console.log(`Handled run status: ${runStatus.status} for runId: ${runId}.`);

    if (runStatus.status === 'completed') {
      // Emit the thread.run.completed event to the client
      //console.log('Emitting thread.run.completed event');
      process.stdout.write(`event: thread.run.completed\ndata: ${JSON.stringify({ threadId, runId })}\n\n`);
      //console.log(`Run completed detected for runId: ${runId}. Preparing to send thread.run.completed event.`);
      runStatusStore[threadId] = { 
        status: 'completed', 
        thread_id: threadId, 
        id: runId,
        usage: runStatus.usage
      };
      //console.log('runStatusStore updated: ', runStatus);
      finalRunStatus = runStatus;

      //console.log(`thread.run.completed event sent for runId: ${runId}.`);

      // Check if image generation flag is set for this run
      const imageGenerated = imageGenerationFlags[runId] || false;

      // Call the tokenCalc API to update the token cost
      if (finalRunStatus.usage) {
        await postTokenCost(runId, finalRunStatus.usage, imageGenerated);
      }

      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate waiting for next event
  }

  // Ensure to store the final run status in memory or database so the client can fetch it
  if (finalRunStatus) {
    runStatusStore[threadId] = {
      status: 'completed',
      thread_id: threadId,
      id: runId,
      usage: finalRunStatus.usage
    };
  }
}

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

  // Extract metadata from formData
  const metadataString = formData.get('metadata') as string | null;
  let metadata = {};
  if (metadataString) {
    try {
      metadata = JSON.parse(metadataString); // Parse the metadata if it exists
      console.log('Metadata received:', metadata);
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }
  }

  // Define newMessage with proper typing
  let newMessage: MessageCreateParams = {
    role: 'user',
    content,
    attachments: [],
    metadata,
  };

  console.log('Creating message with content:', newMessage.content);
  
  // Handle file upload if there's a file attached
  let imageFileAttached = false;
  if (file) {
    const writeFile = promisify(fs.writeFile);
    const unlink = promisify(fs.unlink);
    const fileData = await file.arrayBuffer();
    const fileBuffer = Buffer.from(fileData);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    // Save the file temporarily to disk
    const filePath = path.join('/tmp', file.name);
    await writeFile(filePath, fileBuffer);

    // Determine the appropriate tool based on the file type
    if (fileExtension && ['png', 'jpeg', 'jpg', 'webp', 'gif', 'mp4'].includes(fileExtension)) {
      fileStore[threadId || ''] = { filePath, fileType: file.type };
      imageFileAttached = true;
    } else {
      const fileUploadResponse = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: 'assistants',
      });

      const fileId = fileUploadResponse.id;
      console.log('File uploaded to OpenAI:', fileId);

      await unlink(filePath);

      // Store file ID locally
      if (threadId) {
        addFileToStore(threadId, fileUploadResponse.id);
      }

      // Include the file as an attachment in the message for non-image files
      newMessage.attachments!.push({
        file_id: fileUploadResponse.id,
        tools: [{ type: 'file_search' }]
      });
    }
  }

  // If no thread id then create a new openai thread
  if (!threadId) {
    console.log('Creating a new thread');
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
  }
  console.log('Thread ID:', threadId);

  // Check if the message content needs a hint for image recognition
  const imageRecognitionKeywords = ['image', 'recognize', 'identify', 'analyze', 'picture', 'photo'];
  const containsHint = imageRecognitionKeywords.some(keyword => content.toLowerCase().includes(keyword));

  if (imageFileAttached && !containsHint) {
    newMessage.content += ' Please recognize the attached image.';
    console.log('Added image recognition hint to the message content');
  }

  console.log('Message to be added to thread:', JSON.stringify(newMessage, null, 2));

  try {
    await openai.beta.threads.messages.create(threadId, newMessage);
    //console.log('Message added to thread', JSON.stringify(newMessage, null, 2));

    // Create a run and stream it
    const runStream = openai.beta.threads.runs.stream(threadId, {
      assistant_id: assistantId,
    });

    const assistantStream = runStream; // Use runStream directly if it supports the necessary methods
    const readableStream = runStream.toReadableStream();
    console.log('Readable stream created');

    // Get the initial runId from the assistantStream
    let initialRunId: string | undefined;
    const MAX_RETRIES = 10; // Maximum number of retries
    const RETRY_INTERVAL = 1000; // 1 second between retries
    let retryCount = 0;
      
    while (!initialRunId && retryCount < MAX_RETRIES) {
      const runStatus = assistantStream.currentRun();
      if (runStatus) {
        initialRunId = runStatus.id;
        runStatusStore[threadId] = {
          status: runStatus.status,
          thread_id: threadId,
          id: initialRunId,
          usage: runStatus.usage
        };
        console.log('Initial run status stored:', runStatusStore[threadId]);
      } else {
        retryCount++;
        console.log(`Initial run is undefined, retrying... (${retryCount}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
    
    if (!initialRunId) {
      console.error('Failed to retrieve initial run ID after maximum retries. Operation aborted.');
      // You can return an error response to the client here or handle the error appropriately
      return new Response('Failed to start the run. Please try again later.', { status: 500 });
    }

    // Call the simulateEventSubscription function with the threadId and initialRunId
    simulateEventSubscription(threadId, initialRunId).then(() => {
      console.log('Event subscription simulation completed.');
    }).catch((error) => {
      console.error('Error during event subscription simulation:', error);
    });

    return new Response(readableStream);

  } catch (error) {
    console.error('Error adding message to thread:', error);
    const apiError = error as APIError; // Type assertion
    if (apiError.status === 400 && apiError?.error?.message?.includes("Can't add messages to thread")) {
      runStatusStore[threadId] = { status: 'failed', thread_id: threadId, id: '', failed: true };
    }
    return new Response('Failed to add message to thread', { status: 500 });
  }
}

// Get all of the OpenAI Assistant messages associated with a thread
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const threadId = searchParams.get('threadId');
  const runId = searchParams.get('runId');
  const type = searchParams.get('type');
  const afterMessageId = searchParams.get('afterMessageId'); // Changed from earliestMessageId

  console.log('Received request to fetch messages. threadId:', threadId, 'afterMessageId:', afterMessageId);

  if (type === 'engineInfo') {
    const imageUrl = searchParams.get('imageUrl');
    console.log(`Fetching engine info for imageUrl: ${imageUrl}`);
    if (imageUrl && imageEngineStore[imageUrl]) {
      console.log(`Engine found: ${imageEngineStore[imageUrl]}`);
      return NextResponse.json({ engine: imageEngineStore[imageUrl] });
    } else {
      console.log('No engine info found');
      return NextResponse.json({ engine: null });
    }
  }

  if (!threadId) {
    throw new Error('Missing threadId');
  }

  const openai = new OpenAI();
  let allMessages: Message[] = []; // Explicitly typed
  let after: string | undefined = afterMessageId || undefined; // Ensure after is either a string or undefined

  try {
    // First, retrieve the run status directly from OpenAI
    let runStatus;
    if (runId) {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
    }

    // Loop to accumulate messages
    while (true) {
      const threadMessages = await openai.beta.threads.messages.list(threadId, {
        limit: 100,
        after: after, // Use after to paginate through messages
      });

      console.log('Fetched messages from OpenAI:', threadMessages.data.length);

      if (!threadMessages.data.length) {
        break; // Exit if no more messages are available
      }

      // Cast the OpenAI messages to your Message type
      const cleanMessages: Message[] = threadMessages.data.map((m: any) => {
        let content = '';
        if (m.content && Array.isArray(m.content) && m.content.length > 0) {
          const messageContent = m.content[0] as MessageContent;
          if (messageContent.type === 'text') {
            content = messageContent.text.value;
          } else if (messageContent.type === 'image_file' || messageContent.type === 'image_url') {
            content = messageContent.image.url;
          }
        }

        return {
          id: m.id,
          role: m.role,
          content: content,
          createdAt: m.created_at, // Make sure this matches your Message interface
          metadata: m.metadata || {},
        };
      });

      allMessages = allMessages.concat(cleanMessages); // Collect all messages
      after = threadMessages.data[threadMessages.data.length - 1].id; // Update after for next iteration
    }

    // Reverse allMessages to maintain chronological order
    allMessages.reverse();

    if (runStatus && (runStatus.status === 'completed' || runStatus.status === 'failed')) {
      const tokenUsage = {
        prompt_tokens: runStatus.usage?.prompt_tokens ?? 0,
        completion_tokens: runStatus.usage?.completion_tokens ?? 0,
        total_tokens: runStatus.usage?.total_tokens ?? 0,
      };

      console.log('Message usage:', tokenUsage);
      return NextResponse.json({
        messages: allMessages, // Return all messages
        messageCount: allMessages.length,
        runStatus: runStatus,
        tokenUsage: tokenUsage,
        after: allMessages.length > 0 ? allMessages[allMessages.length - 1].id : null,
      });
    }

    return NextResponse.json({
      messages: allMessages, // Return all messages
      messageCount: allMessages.length,
      runStatus: runStatus || runStatusStore[threadId],
      after: allMessages.length > 0 ? allMessages[allMessages.length - 1].id : null,
    });
  } catch (error) {
    console.error('Error fetching messages and run status:', error);
    throw new Error('Failed to fetch messages and run status');
  }
}

