import OpenAI from 'openai/index.mjs';

interface Message {
  role: string;
  content: string;
}

async function fetchThreadMessages(threadId: string): Promise<Message[]> {
  if (!threadId) {
    console.error('Cannot fetch messages: threadId is null or undefined');
    return [];
  }

  try {
    const response = await fetch('/api/cinetech-assistant?' + new URLSearchParams({ threadId }));
    const data = await response.json();

    console.log('Fetched messages from server:', data.messages);

    return data.messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function generateThreadSynopsis(threadId: string): Promise<string | null> {
  const openai = new OpenAI();
  console.log('Starting to generate thread synopsis for threadId:', threadId);

  try {
    // Step 1: Fetch all messages from the thread
    const threadMessages = await fetchThreadMessages(threadId);
    console.log('Thread messages fetched:', threadMessages);

    if (!threadMessages || threadMessages.length === 0) {
      throw new Error('No messages found in the thread.');
    }

    // Step 2: Combine and concatenate the messages into a single string with improved formatting
    const conversation = threadMessages
      .map((msg: Message) => `${msg.role}: ${msg.content.trim()}`)
      .join(' ');
    console.log('Formatted conversation:', conversation);

    // Step 3: Limit the conversation to the last 96,000 words
    const words = conversation.split(' ');
    const recentConversation = words.slice(-96000).join(' ');

    console.log('Formatted conversation:', recentConversation);

    // Step 4: Create a prompt with instructions as a preface
    const prompt = `
      Please analyze the following conversation and provide a detailed synopsis of no more than 750 words. The synopsis should include:
      - Major or key points made by either party, structured as {"point": "Description"}.
      - Important or highly relevant points, structured as {"point": "Description"}.
      - Major facts pointed out, structured as {"fact": "Description"}.
      - A list of topics covered and their weightings in the format: { "Topic": "Weight%" }.
      - A list of no more than 10 keywords with their weightings in the format: { "Keyword": "Weight%" }.

      Here is the conversation:
      
      ${recentConversation}
    `;

    console.log('Generated prompt:', prompt);

    // Step 4: Send the prompt to the OpenAI chat completions endpoint
    const completionResponse = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 750,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "conversation_synopsis",
          schema: {
            type: "object",
            properties: {
              topics: {
                type: "object",
                additionalProperties: { type: "string" }
              },
              keywords: {
                type: "object",
                additionalProperties: { type: "string" }
              }
            },
            additionalProperties: false
          },
          strict: true
        }
      }                                            
    });

    const synopsis = completionResponse?.choices?.[0]?.message?.content?.trim() ?? null;
    console.log('Generated synopsis:', synopsis);

    return synopsis;
  } catch (error) {
    console.error('Error generating thread synopsis:', error);
    return null;
  }
}
