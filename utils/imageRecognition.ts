// utils/imageRecognition.ts
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI();

const encodeImage = (imageFilePath: string): string => {
  const fileData = fs.readFileSync(imageFilePath);
  return fileData.toString('base64');
};

export const imageRecognition = async (imageFilePath: string, userMessage: string): Promise<string> => {
  try {
    const base64Image = encodeImage(imageFilePath);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userMessage,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    return response.choices[0].message.content ?? '';
  } catch (error) {
    console.error('Error calling chat completions:', error);
    throw new Error('Failed to call chat completions endpoint');
  }
};
