import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
}

interface LibraryContextType {
  fetchedImages: Image[];
  fetchedMessages: Message[];
  fetchImages: (userId: string) => Promise<void>;
  fetchMessages: (userId: string) => Promise<Message[]>;
  addImage: (image: Image) => void;
  addMessage: (message: Message) => void;
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
      const response = await fetch(`/api/get-lib-images?userId=${userId}&t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data.images)) {
          const formattedImages = data.images.map((image: any) => ({
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

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/get-lib-messages?userId=${userId}&t=${Date.now()}`);
      const data = await response.json();
      if (response.ok) {
        console.log('API response data:', data);
        if (Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map((message: any) => ({
            url: message.messageUrl,
            timestamp: message.timestamp,
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
    setFetchedMessages((prevMessages) => [...prevMessages, newMessage]);
  };

  return (
    <LibraryContext.Provider value={{ fetchedImages, fetchedMessages, fetchImages, fetchMessages, addImage, addMessage }}>
      {children}
    </LibraryContext.Provider>
  );
};
