import { generateImageFromOpenAI } from './generateImageFromOpenAI';
import { preprocessPrompt } from './promptMiddleware';  // Import the middleware function

export async function generateImage(content: string, style: string | null = null): Promise<string> {
  let result: string | null;
  let engine: string;

  // Preprocess the content with the selected style using the middleware function
  const modifiedContent = preprocessPrompt(content, style);

  // Use OpenAI (DALL-E)
  result = await generateImageFromOpenAI(modifiedContent);
  engine = 'DALL-E';
  console.log(`Generated image from OpenAI: ${result}` );

  // Log the result and engine together
  console.log(`Result: ${result}, Engine: ${engine}`);

  return JSON.stringify({ result, engine });
}
