// utils/imageRecognition.ts
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI();

const encodeImage = (imageFilePath: string): string => {
  console.log(`Reading image file: ${imageFilePath}`); // Log the image file path
  const fileData = fs.readFileSync(imageFilePath);
  console.log(`Image file read successfully: ${fileData.length} bytes`); // Log the file size
  return fileData.toString('base64');
};

export const imageRecognition = async (imageFilePath: string, userMessage: string): Promise<string> => {
  console.log(`Starting image recognition for file: ${imageFilePath}`); // Log the start of the function
  try {
    const base64Image = encodeImage(imageFilePath);
    console.log(`Image encoded successfully, length of base64 string: ${base64Image.length}`); // Log the base64 string length

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

    console.log('Response received from OpenAI:', response); // Log the full response for inspection\
    console.log('Response received from OpenAI:', {
      model: response.model,
      choices: response.choices,
      usage: response.usage, // Log usage information if available
      created: response.created, // Timestamp of the request
    });

    return response.choices[0].message.content ?? '';
  } catch (error) {
    console.error('Error calling chat completions:', error); // Log error details
    throw new Error('Failed to call chat completions endpoint');
  }
};
