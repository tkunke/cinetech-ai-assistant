import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';  // Import the Workspace context
import { createClient } from '@supabase/supabase-js';

interface Tag {
  id: string;
  name: string;
}

interface Image {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  tags: Tag[];
  workspaceId: string;
}

interface Message {
  content: string;
  preview: string;
  url: string;
  timestamp: string;
  tags: Tag[];
  workspaceId: string;
}

interface Payload<T> {
  new: Partial<T>;
  old: Partial<T>;
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

const supabaseUrl = 'https://xeatvqzhnxnxdbxfaduh.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey as string);

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
  const [workspaceImages, setWorkspaceImages] = useState<{ [workspaceId: string]: Image[] }>({});
  const [workspaceMessages, setWorkspaceMessages] = useState<{ [workspaceId: string]: Message[] }>({});
  const { activeWorkspaceId } = useWorkspace();  // Get the active workspace ID from context

  const fetchImages = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/get-lib-images?workspaceId=${workspaceId}&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-store', // Ensure no caching of the response
          'Pragma': 'no-cache' // Additional header for backwards compatibility with older HTTP/1.0 caches
        }
      });
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
          setWorkspaceImages((prev) => ({
            ...prev,
            [workspaceId]: formattedImages,
          }));
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
        console.log('API response message data:', data);
        if (Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map((message: any) => ({
            id: message.messageId,
            url: message.messageUrl,
            timestamp: new Date(message.timestamp),
            content: message.content,
            preview: message.messagePreview,
            tags: message.tags || [], // Include tags from the API, or default to an empty array
          }));
          setWorkspaceMessages((prev) => ({
            ...prev,
            [workspaceId]: formattedMessages,
          }));
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
    setWorkspaceImages((prev) => ({
      ...prev,
      [newImage.workspaceId]: [...(prev[newImage.workspaceId] || []), newImage],
    }));
  };

  const addMessage = (newMessage: Message) => {
    console.log('New message to be added:', newMessage);
  
    if (!newMessage.workspaceId) {
      console.error('Error: workspaceId is undefined for the new message:', newMessage);
      return;
    }
  
    // Safeguard: Check if the timestamp is valid and fallback to the current date if not
    const formattedTimestamp = isNaN(new Date(newMessage.timestamp).getTime())
      ? new Date().toISOString()  // Fallback to the current date if the timestamp is invalid
      : new Date(newMessage.timestamp).toISOString();
  
    setWorkspaceMessages((prev) => {
      const updatedMessages = {
        ...prev,
        [newMessage.workspaceId]: [
          ...(prev[newMessage.workspaceId] || []), 
          { ...newMessage, timestamp: formattedTimestamp }, // Add formatted or fallback timestamp
        ],
      };
  
      console.log('Updated Messages:', updatedMessages);
      return updatedMessages;
    });
  };      
  

  useEffect(() => {
    // Ensure there's an active workspace ID before subscribing
    if (!activeWorkspaceId) {
      console.warn('No active workspace ID, skipping listener setup');
      return;
    }
  
    console.log(`Initializing real-time listener for workspace ${activeWorkspaceId}`);
  
    // Set up the subscription
    const workspaceChannel = supabase
      .channel(`workspace-${activeWorkspaceId}-images`)  // Workspace-specific channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_gen_images' },  // Listen to INSERT events
        (payload) => {
          // Log the entire payload for visibility
          console.log('Change received:', payload);
  
          // Make sure the payload and new image data are present
          if (payload && payload.new) {
            const newImage = {
              id: payload.new.id,
              imageUrl: payload.new.image_url,
              thumbnailUrl: payload.new.thumbnail_url,
              tags: payload.new.tags || [],
              workspaceId: payload.new.workspace_id,
            };
  
            // Log workspace IDs before comparison
            console.log('Current workspace ID:', activeWorkspaceId);
            console.log('Image workspace ID:', newImage.workspaceId);
  
            // Ensure both IDs are strings for comparison
            if (String(newImage.workspaceId) === String(activeWorkspaceId)) {
              console.log('Adding image to state for active workspace');
              addImage(newImage);  // Update state
            } else {
              console.log(`Image belongs to workspace ${newImage.workspaceId}, not ${activeWorkspaceId}. Ignoring.`);
            }
          } else {
            console.warn('No new image data in event payload.');
          }
        }
      )
      .subscribe();
  
    // Clean up the subscription when the component unmounts
    return () => {
      console.log(`Removing real-time listener for workspace ${activeWorkspaceId}`);
      supabase.removeChannel(workspaceChannel);
    };
  }, [activeWorkspaceId, addImage]);  // Rerun effect if the active workspace ID changes

  useEffect(() => {
    if (!activeWorkspaceId) return;  // Ensure there's an active workspace

    console.log(`Initializing real-time listener for messages in workspace ${activeWorkspaceId}`);
    
    const workspaceMessageChannel = supabase
      .channel(`workspace-${activeWorkspaceId}-messages`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_gen_messages' }, (payload) => {
        if (payload && payload.new) {
          const newMessage = {
            id: payload.new.id,
            content: payload.new.content,
            timestamp: payload.new.timestamp,
            url: payload.new.message_url,
            tags: payload.new.tags || [],
            preview: payload.new.preview,
            workspaceId: payload.new.workspace_id,
          };

          console.log('New message from real-time listener:', newMessage);
          if (newMessage.workspaceId === activeWorkspaceId) {
            addMessage(newMessage);  // Update state with the new message
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(workspaceMessageChannel);
    };
  }, [activeWorkspaceId, addMessage]);  

  const removeImage = (imageUrl: string) => {
    if (!activeWorkspaceId) return;

    setWorkspaceImages((prev) => ({
      ...prev,
      [activeWorkspaceId]: prev[activeWorkspaceId].filter(image => image.imageUrl !== imageUrl),
    }));
  };

  const fetchedImages = activeWorkspaceId ? workspaceImages[activeWorkspaceId] || [] : [];
  const fetchedMessages = activeWorkspaceId ? workspaceMessages[activeWorkspaceId] || [] : [];

  return (
    <LibraryContext.Provider value={{ fetchedImages, fetchedMessages, fetchImages, fetchMessages, addImage, addMessage, removeImage }}>
      {children}
    </LibraryContext.Provider>
  );
};
