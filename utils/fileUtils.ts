import OpenAI from 'openai/index.mjs';

// In-memory store for thread files
const threadFileStore: { [threadId: string]: string[] } = {};

// Function to add a file ID to the store
export function addFileToStore(threadId: string, fileId: string): void {
  if (!threadFileStore[threadId]) {
    threadFileStore[threadId] = [];
  }
  threadFileStore[threadId].push(fileId);
}

// Function to get file IDs from the store
export function getFilesFromStore(threadId: string): string[] | null {
  return threadFileStore[threadId] || null;
}

// Function to delete file IDs from the store
export function deleteFilesFromStore(threadId: string): void {
  delete threadFileStore[threadId];
}

// Function to delete files from OpenAI
export async function deleteThreadFiles(fileIds: string[]): Promise<void> {
  const openai = new OpenAI();
  try {
    for (const fileId of fileIds) {
      await openai.files.del(fileId);
      console.log(`Deleted file with ID: ${fileId}`);
    }
  } catch (error) {
    console.error('Error deleting files:', error);
  }
}

// Function to clean up files associated with a thread
export async function cleanupThreadFiles(): Promise<void> {
  try {
    for (const threadId in threadFileStore) {
      const fileIds = getFilesFromStore(threadId);
      if (fileIds && fileIds.length > 0) {
        await deleteThreadFiles(fileIds);
        deleteFilesFromStore(threadId);
        console.log(`Cleaned up file store with IDs: ${fileIds}`);
      } else {
        console.error('No file IDs found for thread:', threadId);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
}
