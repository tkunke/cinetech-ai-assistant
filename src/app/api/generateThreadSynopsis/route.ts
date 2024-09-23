import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';



const isServerSide = typeof window === 'undefined';
const baseUrl = isServerSide ? process.env.NEXT_PUBLIC_BASE_URL : '';

const ConversationSynopsisSchema = z.object({
  summary: z.string(),
  topics: z.array(z.object({
    topic: z.string(),
    weight: z.string()
  })),
  keywords: z.array(z.object({
    keyword: z.string(),
    weight: z.string()
  }))
});

// Utility function to fetch thread messages
async function fetchThreadMessages(threadId: string): Promise<{ role: string; content: string; }[]> {
  try {
    const response = await fetch(`${baseUrl}/api/cinetech-assistant?threadId=${threadId}`);
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

// Main function to generate the thread synopsis
export async function GET(request: NextRequest): Promise<NextResponse> {
  const threadId = request.nextUrl.searchParams.get('threadId');

  if (!threadId) {
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  const openai = new OpenAI();

  try {
    // Fetch all messages from the thread
    const threadMessages = await fetchThreadMessages(threadId);

    if (threadMessages.length === 0) {
      throw new Error('No messages found in the thread.');
    }

    // Combine and concatenate the messages into a single string
    const conversation = threadMessages.map(msg => `${msg.role}: ${msg.content.trim()}`).join(' ');

    // Limit the conversation to the last 96,000 words
    const words = conversation.split(' ');
    const recentConversation = words.slice(-96000).join(' ');

    // Create the prompt for OpenAI
    const prompt = `
      You are an expert at structured data extraction. You will be given unstructured text from a conversation and should convert it into the following structure:
      - A short summary in paragraph form.
      - A list of topics covered, along with their weightings as percentages, formatted as:
        [{ "topic": "example topic", "weight": "20%" }]
      - A list of keywords covered, along with their weightings as percentages, formatted as:
        [{ "keyword": "example keyword", "weight": "15%" }]
      
      Here is the conversation:
      
      ${recentConversation}
    `;

    // Call the OpenAI API using the Zod schema for structured response validation
    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [{ role: 'user', content: prompt }],
      response_format: zodResponseFormat(ConversationSynopsisSchema, 'conversation_synopsis'),
    });

    // Extract the parsed synopsis from the response
    const synopsis = completion.choices[0].message.parsed;

    return NextResponse.json({ synopsis });
  } catch (error) {
    console.error('Error generating thread synopsis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}