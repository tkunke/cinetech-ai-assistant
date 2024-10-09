import { generateImageFromStability } from './generateImageFromStability';
import { preprocessPrompt } from './promptMiddleware';  // Import the middleware function

export async function generateImage(content: string, style: string | null = null): Promise<string> {
  let result: string | null;
  let engine: string;

  // Preprocess the content with the selected style using the middleware function
  const modifiedContent = preprocessPrompt(content, style);

  // Use Stability AI
  result = await generateImageFromStability(modifiedContent);
  engine = 'Stability AI';
  console.log(`Generated image from StabilityAI: ${result}`)

  // Log the result and engine together
  console.log(`Result: ${result}, Engine: ${engine}`);

  return JSON.stringify({ result, engine });
}
