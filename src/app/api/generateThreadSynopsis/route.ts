import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai/index.mjs';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

interface Synopsis {
  summary: string;
  topics: Array<{
    topic: string;
    weight: string;
  }>;
  keywords: Array<{
    keyword: string;
    weight: string;
  }>;
}

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
  console.log(`Fetching messages for threadId: ${threadId}`);
  try {
    const response = await fetch(`${baseUrl}/api/cinetech-assistant?threadId=${threadId}`);
    const data = await response.json();
    console.log(`Messages fetched: ${data.messages.length}`);
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const threadId = request.nextUrl.searchParams.get('threadId');
  console.log(`GET request received for threadId: ${threadId}`);

  if (!threadId) {
    return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
  }

  const openai = new OpenAI();

  try {
    const threadMessages = await fetchThreadMessages(threadId);

    if (threadMessages.length === 0) {
      throw new Error('No messages found in the thread.');
    }
    console.log(`Messages in thread: ${threadMessages.length}`);

    // Check if the number of messages is greater than 20
    if (threadMessages.length <= 20) {
      console.log('Not enough messages to generate a synopsis');
      return NextResponse.json({ error: 'Not enough messages to generate synopsis' }, { status: 400 });
    }

    const conversation = threadMessages.map(msg => `${msg.role}: ${msg.content.trim()}`).join(' ');
    const words = conversation.split(' ');
    const recentConversation = words.slice(-96000).join(' ');

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

    console.log('Sending prompt to OpenAI:', prompt.slice(0, 500));

    const completion = await openai.beta.chat.completions.parse({
      model: 'gpt-4o-2024-08-06',
      messages: [{ role: 'user', content: prompt }],
      response_format: zodResponseFormat(ConversationSynopsisSchema, 'conversation_synopsis'),
    });

    console.log('Received completion from OpenAI:', completion);

    const synopsis = completion.choices[0].message.parsed;
    console.log('Parsed synopsis:', synopsis);

    // Save the synopsis to the database here
    if (synopsis) {
      await saveAnalysis(threadId, synopsis); // Call saveAnalysis only if synopsis is valid
      console.log('Synopsis saved successfully');
    } else {
      throw new Error('Synopsis generation returned null.');
    }

    return NextResponse.json({ synopsis });
  } catch (error) {
    console.error('Error generating thread synopsis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to save the synopsis
async function saveAnalysis(threadId: string, synopsis: Synopsis) {
  const { topics, keywords, summary } = synopsis;

  try {
    console.log('Saving analysis to database:', { threadId, summary, topics, keywords });
    const response = await fetch(`${baseUrl}/api/saveAnalysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threadId,
        topics,
        keywords,
        summary,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save analysis');
    }

    console.log('Analysis saved successfully');
  } catch(error) {
    console.error('Error saving analysis:', error);
  }
}