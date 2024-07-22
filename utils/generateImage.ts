import { generateImageFromOpenAI } from './generateImageFromOpenAI';

export async function generateImage(content: string): Promise<string> {
  let result: string | null;
  let engine: string;

  // Use OpenAI (DALL-E)
  result = await generateImageFromOpenAI(content);
  engine = 'DALL-E';
  console.log(`Generated image from OpenAI: ${result}` )

  // Log the result and engine together
  console.log(`Result: ${result}, Engine: ${engine}`);

  return JSON.stringify({ result, engine });
}