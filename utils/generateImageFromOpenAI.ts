import OpenAI from 'openai';
const openai = new OpenAI();

export async function generateImageFromOpenAI(content: string): Promise<string | null> {
  console.log('Assistant prompt:', content);
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: content,
    });

    console.log('OpenAI response:', response);

    if (response.data && response.data.length > 0) {
      const url = response.data[0].url ?? null; // Ensure the URL is either a string or null
      return url;
    } else {
      console.log('No data found in the response');
      return null;
    }
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}
