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
  id: string;
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
  fetchedTags: Tag[];
  fetchImages: (userId: string, workspaceId: string) => Promise<void>;
  fetchMessages: (userId: string, workspaceId: string) => Promise<Message[]>;
  fetchTags: (userId: string, workspaceId: string) => Promise<void>;
  createTag: (userId: string, workspaceId: string, tagName: string) => Promise<void>;
  updateTag: (userId: string, workspaceId: string, tagId: string, newTagName: string) => Promise<void>;
  deleteTag: (userId: string, workspaceId: string, tagId: string) => Promise<void>;
  addImage: (image: Image) => void;
  addMessage: (message: Message) => void;
  removeImage: (imageUrl: string) => void;
  removeMessage: (messageId: string) => void;
  untagContent: (contentId: string, tagId: string, contentType: 'image' | 'message') => Promise<Response | undefined>;
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
  const [fetchedTags, setFetchedTags] = useState<Tag[]>([]);
  const { workspaces, activeWorkspaceId } = useWorkspace();  // Get the active workspace ID from context

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

  // Fetch tags for the active workspace
  const fetchTags = useCallback(async (userId: string, workspaceId: string) => {
    console.log(`Fetching tags for user ${userId} in workspace ${workspaceId}`);
    if (!userId || !workspaceId) return; // Cache tags once fetched
    try {
      const response = await fetch(`/api/userTags?userId=${userId}&workspaceId=${workspaceId}`);
      const data = await response.json();
      console.log('Tags fetched:', data);
      if (response.ok) {
        setFetchedTags(data.tags);
      } else {
        console.error('Failed to fetch tags:', data.error);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  }, []);

  const createTag = async (userId: string, workspaceId: string, tagName: string) => {
    if (!userId || !workspaceId || !tagName.trim()) return;
    try {
      const response = await fetch('/api/userTags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, workspaceId, tag: { name: tagName.trim() } }),
      });
      if (response.ok) {
        const newTag = await response.json();
        setFetchedTags((prevTags) => [...prevTags, newTag]); // Add the new tag to state
      } else {
        console.error('Failed to create tag');
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const updateTag = async (userId: string, workspaceId: string, tagId: string, newTagName: string) => {
    if (!userId || !workspaceId || !tagId || !newTagName.trim()) return;
    try {
      const response = await fetch('/api/userTags', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, workspaceId, tag: { id: tagId, name: newTagName.trim() } }), // Update to send the tag as an object
      });
      if (response.ok) {
        setFetchedTags((prevTags) =>
          prevTags.map((tag) => (tag.id === tagId ? { ...tag, name: newTagName } : tag))
        );
      } else {
        console.error('Failed to update tag');
      }
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };  
  
  const deleteTag = async (userId: string, workspaceId: string, tagId: string) => {
    if (!userId || !workspaceId || !tagId) return;
    try {
      const response = await fetch('/api/userTags', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, workspaceId, tagId }),
      });
      if (response.ok) {
        setFetchedTags((prevTags) => prevTags.filter((tag) => tag.id !== tagId)); // Remove the tag from state
      } else {
        console.error('Failed to delete tag');
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const untagContent = async (contentId: string, tagId: string, contentType: 'image' | 'message') => {
    if (!contentId || !tagId) return;
  
    try {
      const response = await fetch('/api/untagContent', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contentId, tagId, contentType }),
      });
  
      if (response.ok) {
        console.log('Content untagged successfully');
        return response;
      } else {
        const errorData = await response.json();
        console.error('Failed to untag content on server:', errorData);
        return response;
      }
    } catch (error) {
      console.error('Error during untag request:', error);
    }
  };
  

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
    // Initialize real-time listeners once when the user logs in.
    console.log('Initializing global real-time listeners for images, messages, tags');
  
    // Set up the subscription for images across all workspaces
    const imageListener = supabase
      .channel('all-workspaces-images')  // Global channel for all images
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_gen_images' },  // Listen to INSERT events
        (payload) => {
          // Log the payload for visibility
          console.log('Change received for images:', payload);
  
          // Make sure the payload and new image data are present
          if (payload && payload.new) {
            const newImage = {
              id: payload.new.id,
              imageUrl: payload.new.image_url,
              thumbnailUrl: payload.new.thumbnail_url,
              tags: payload.new.tags || [],
              workspaceId: payload.new.workspace_id,
            };
  
            addImage(newImage);
          } else {
            console.warn('No new image data in event payload.');
          }
        }
      )
      .subscribe();
  
    const messageListener = supabase
      .channel('all-workspaces-messages')  // Global channel for all messages
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_gen_messages' },
        (payload) => {
          // Log the payload for visibility
          console.log('Change received for images:', payload);

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
  
            addMessage(newMessage);
          } else {
            console.warn('No new message data in event payload.');
          }
        }
      )
      .subscribe();
  
    const tagInsertListener = supabase
      .channel('all-workspaces-tags')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'project_tags' },
        (payload) => {
          console.log('INSERT event received for tags:', payload);
          if (payload.new) {
            const newTag: Tag = {
              id: payload.new.id,
              name: payload.new.name,
            };
            setFetchedTags((prevTags) => [...prevTags, newTag]);
          }
        }
      )
      .subscribe();

    const tagUpdateListener = supabase
      .channel('all-workspaces-tags')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'project_tags' },
        (payload) => {
          console.log('UPDATE event received for tags:', payload);
          if (payload.new) {
            const updatedTag: Tag = {
              id: payload.new.id,
              name: payload.new.name,
            };
            setFetchedTags((prevTags) =>
              prevTags.map((tag) =>
                tag.id === updatedTag.id ? updatedTag : tag
              )
            );
          }
        }
      )
      .subscribe();

    const tagDeleteListener = supabase
      .channel('all-workspaces-tags')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'project_tags' },
        (payload) => {
          console.log('DELETE event received for tags:', payload);
          if (payload.old) {
            setFetchedTags((prevTags) =>
              prevTags.filter((tag) => tag.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();
  
    // Clean up the subscription when the component unmounts
    return () => {
      console.log('Removing global real-time listeners');
      supabase.removeChannel(imageListener);
      supabase.removeChannel(messageListener);
      supabase.removeChannel(tagInsertListener);
      supabase.removeChannel(tagUpdateListener);
      supabase.removeChannel(tagDeleteListener);
    };
  }, [workspaces]);  

  const removeImage = (imageUrl: string) => {
    if (!activeWorkspaceId) return;

    setWorkspaceImages((prev) => ({
      ...prev,
      [activeWorkspaceId]: prev[activeWorkspaceId].filter(image => image.imageUrl !== imageUrl),
    }));
  };

  const removeMessage = (messageId: string) => {
    if (!activeWorkspaceId) return; // Ensure there is an active workspace

    setWorkspaceMessages((prev) => ({
      ...prev,
      [activeWorkspaceId]: prev[activeWorkspaceId].filter(message => message.id !== messageId),
    }));
  };

  const fetchedImages = activeWorkspaceId ? workspaceImages[activeWorkspaceId] || [] : [];
  const fetchedMessages = activeWorkspaceId ? workspaceMessages[activeWorkspaceId] || [] : [];

  return (
    <LibraryContext.Provider value={{ fetchedImages, fetchedMessages, fetchedTags, fetchImages, fetchMessages, fetchTags, createTag, updateTag, deleteTag, untagContent, addImage, addMessage, removeImage, removeMessage }}>
      {children}
    </LibraryContext.Provider>
  );
};
