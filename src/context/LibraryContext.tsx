import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';  // Import the Workspace context

interface Tag {
  id: string;
  name: string;
}

interface Image {
  imageUrl: string;
  thumbnailUrl: string;
  tags: Tag[];
}

interface Message {
  content: string;
  thumbnailUrl: string;
  url: string;
  timestamp: string;
  tags: Tag[];
}

interface LibraryContextType {
  fetchedImages: Image[];
  fetchedMessages: Message[];
  fetchImages: (userId: string, workspaceId: string) => Promise<void>;
  fetchMessages: (userId: string, workspaceId: string) => Promise<Message[]>;
  addImage: (image: Image) => void;
  addMessage: (message: Message) => void;
  removeImage: (imageUrl: string) => void;
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
  const { activeWorkspaceId } = useWorkspace();  // Get the active workspace ID from context

  const fetchImages = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/get-lib-images?workspaceId=${workspaceId}&t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data.images)) {
          const formattedImages = data.images.map((image: any) => ({
            id: image.imageId,
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl,
            tags: image.tags, // No need to parse tags again
          }));
          console.log('Formatted images:', formattedImages);
          setFetchedImages(formattedImages);
        } else {
          console.error('API response images is not an array:', data.images);
        }
      } else {
        console.error('Failed to fetch images:', data.error);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  }, []);  

  const fetchMessages = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/get-lib-messages?workspaceId=${workspaceId}&t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        console.log('API response data:', data);
        if (Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map((message: any) => ({
            id: message.messageId,
            url: message.messageUrl,
            timestamp: message.timestamp,
            content: message.content,
            tags: message.tags || [], // Include tags from the API, or default to an empty array
          }));
          console.log('Formatted messages:', formattedMessages);
          setFetchedMessages(formattedMessages);
          return formattedMessages;
        } else {
          console.error('API response messages is not an array:', data.messages);
        }
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
    return [];
  }, []);  

  const addImage = (newImage: Image) => {
    setFetchedImages((prevImages) => [...prevImages, newImage]);
  };
  
  const addMessage = (newMessage: Message) => {
    console.log('New message to be added:', newMessage);
  
    setFetchedMessages((prevMessages) => {
      const existingMessages = [...prevMessages];
  
      // Check if the new message already exists (by URL), and update it if necessary
      const existingIndex = existingMessages.findIndex(msg => msg.url === newMessage.url);
      if (existingIndex > -1) {
        existingMessages[existingIndex] = { ...existingMessages[existingIndex], ...newMessage };
      } else {
        existingMessages.push(newMessage);
      }
  
      console.log('Updated messages array:', existingMessages);
  
      return existingMessages;
    });
  };  

  const removeImage = (imageUrl: string) => {
    setFetchedImages((prevImages) => prevImages.filter(image => image.imageUrl !== imageUrl));
  };

  return (
    <LibraryContext.Provider value={{ fetchedImages, fetchedMessages, fetchImages, fetchMessages, addImage, addMessage, removeImage }}>
      {children}
    </LibraryContext.Provider>
  );
};
