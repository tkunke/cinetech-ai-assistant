import { promises as fs } from 'fs';
import path from 'path';

export async function saveImageLocally(base64Data: string, fileName: string): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const imagesDir = path.join(process.cwd(), 'public', 'images'); // Use process.cwd() to get the root directory

  // Ensure the directory exists
  await fs.mkdir(imagesDir, { recursive: true });

  const filePath = path.join(imagesDir, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}
