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
  
  try {
    // Step 1: Fetch all messages from the thread
    const threadMessages = await fetchThreadMessages(threadId);
    
    if (!threadMessages || threadMessages.length === 0) {
      throw new Error('No messages found in the thread.');
    }

    // Step 2: Combine and concatenate the messages into a single string with improved formatting
    const conversation = threadMessages
      .map((msg: Message) => `${msg.role}: ${msg.content.trim()}`)
      .join(' ');

    // Step 3: Create a prompt with instructions as a preface
    const prompt = `
      Please analyze the following conversation and provide a detailed synopsis of no more than 750 words. 
      The synopsis should include:
      - Topics covered
      - Major or key points made by either party
      - Important or highly relevant points in the conversation
      - Major facts pointed out
      - A list of keywords not to exceed 10

      Here is the conversation:
      
      ${conversation}
    `;

    // Step 4: Send the prompt to the OpenAI chat completions endpoint
    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 750,
      }),
    });

    if (!completionResponse.ok) {
      throw new Error('Failed to generate a synopsis.');
    }

    const completionData = await completionResponse.json();
    const synopsis = completionData.choices[0].message.content.trim();

    return synopsis;
  } catch (error) {
    console.error('Error generating thread synopsis:', error);
    return null;
  }
}
