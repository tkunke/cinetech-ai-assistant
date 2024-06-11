import axios from 'axios';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const openaiKey = process.env.OPENAI_API_KEY as string;

export const processSearchResults = async (user_request: string, search_results: string): Promise<string> => {
  if (!openaiKey) {
    throw new Error('OpenAI API key is not set in the environment variables');
  }

  console.log('Analyzing/processing Bing search results:', search_results);

  // Use GPT to analyze the Bing search results
  const prompt = `Analyze these Bing search results: '${search_results}'\nbased on this user request: ${user_request}`;

  const response = await axios.post<OpenAIResponse>(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o', // Replace with the appropriate model name
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${openaiKey}`,
      },
    }
  );

  const analysis = response.data.choices[0].message.content.trim();

  console.log('Analysis result:', analysis);

  // Return the analysis
  return analysis;
};