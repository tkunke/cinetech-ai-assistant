import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Image {
  imageUrl: string;
  thumbnailUrl: string;
}

interface Message {
  content: string;
  thumbnailUrl: string;
  url: string;
}

interface LibraryContextType {
  fetchedImages: Image[];
  fetchedMessages: Message[];
  fetchImages: (userId: string) => Promise<void>;
  fetchMessages: (userId: string) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = (): LibraryContextType => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};

interface LibraryProviderProps {
  children: ReactNode;
}

export const LibraryProvider: React.FC<LibraryProviderProps> = ({ children }) => {
  const [fetchedImages, setFetchedImages] = useState<Image[]>([]);
  const [fetchedMessages, setFetchedMessages] = useState<Message[]>([]);

  const fetchImages = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/get-lib-images?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data.blobs)) {
          const formattedImages = data.blobs.map((blob: any) => ({
            imageUrl: blob.url,
            thumbnailUrl: blob.url // Adjust this if you have a separate thumbnail URL
          }));
          setFetchedImages(formattedImages);
        } else {
          console.error('API response blobs is not an array:', data.blobs);
        }
      } else {
        console.error('Failed to fetch images:', data.error);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/get-lib-messages?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data.blobs)) {
          const formattedMessages = data.blobs.map((blob: any) => ({
            content: blob.url, // Placeholder for the content; will be fetched when clicked
            thumbnailUrl: blob.url.replace('.json', '.png'), // Adjust this if you have a separate thumbnail URL
            url: blob.url,
          }));
          setFetchedMessages(formattedMessages);
        } else {
          console.error('API response blobs is not an array:', data.blobs);
        }
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);   

  return (
    <LibraryContext.Provider value={{ fetchedImages, fetchedMessages, fetchImages, fetchMessages }}>
      {children}
    </LibraryContext.Provider>
  );
};
