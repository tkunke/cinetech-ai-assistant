import { generateImageFromStability } from './generateImageFromStability';

export async function alternateImage(content: string): Promise<string> {
  let result: string | null;
  let engine: string;

  // Use Stability AI
  result = await generateImageFromStability(content);
  engine = 'Stability AI';
  console.log(`Generated image from StabilityAI: ${result}`)

  // Log the result and engine together
  console.log(`Result: ${result}, Engine: ${engine}`);

  return JSON.stringify({ result, engine });
}