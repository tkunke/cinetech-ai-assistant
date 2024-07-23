import OpenAI from 'openai';
import axios from 'axios';
import { put } from '@vercel/blob';

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
      const imageUrl = response.data[0].url ?? null; // Ensure the URL is either a string or null
      if (!imageUrl) {
        console.log('No URL found in the response');
        return null;
      }

      // Download the image as a buffer
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);
      const imageBase64 = imageBuffer.toString('base64');

      // Upload the image to Vercel Blob
      const fileName = `openai-tmp-img_${Date.now()}.webp`;
      const blob = await put(fileName, Buffer.from(imageBase64, 'base64'), {
        access: 'public',
      });

      console.log('Uploaded Image URL:', blob.url);
      return blob.url;
    } else {
      console.log('No data found in the response');
      return null;
    }
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}
