import axios from 'axios';
import { stringify } from 'querystring';

interface BingSearchResult {
  name: string;
  url: string;
  snippet: string;
}

export const performBingSearch = async (user_request: string): Promise<BingSearchResult[]> => {
  console.log('performBingSearch called with:', user_request);
  const bingApiKey = process.env.BING_API_KEY as string;

  if (!bingApiKey) {
    throw new Error('Bing API key is not set in the environment variables');
  }

  // Directly format the search query
  const searchQuery = `movies currently playing in ${user_request}`;
  const bingSearchQuery = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}`;

  console.log(`Bing search query URL: ${bingSearchQuery}`);

  try {
    const response = await axios.get(bingSearchQuery, {
      headers: {
        'Ocp-Apim-Subscription-Key': bingApiKey,
      },
    });

    const responseData = response.data;
    let searchResults: BingSearchResult[] = [];

    if (responseData.webPages && responseData.webPages.value) {
      searchResults = responseData.webPages.value.map((result: any) => ({
        name: result.name,
        url: result.url,
        snippet: result.snippet,
      }));
    } else {
      console.warn('No relevant results found in the Bing search response:', responseData);
      return [];
    }

    return searchResults;
  } catch (error: any) {
    console.error('Encountered exception during Bing search:', error.message);
    console.error('Bing API response:', error.response?.data);
    throw error;
  }
};
