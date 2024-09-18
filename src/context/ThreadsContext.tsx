// ThreadsContext file

import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface Thread {
  id: string;
  title: string;
}

interface ThreadsContextType {
  threads: Thread[];
  fetchThreads: (userId: string) => void;
  saveThread: (userId: string, threadId: string, title: string) => Promise<void>;
  saveThreadOnClose: (userId: string, threadId: string, title: string) => void;
  addThread: (thread: Thread) => void;
}

const ThreadsContext = createContext<ThreadsContextType | undefined>(undefined);

interface ThreadsProviderProps {
  children: ReactNode;
}

export const ThreadsProvider: React.FC<ThreadsProviderProps> = ({ children }) => {
  const [threads, setThreads] = useState<Thread[]>([]);

  const fetchThreads = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/getThreads?userId=${userId}`);
      const data = await response.json();
      const mappedThreads = data.threads.map((thread: any) => ({
        id: thread.thread_id,
        title: thread.title,
      }));
      setThreads(mappedThreads || []);
      console.log('Threads set in state:', mappedThreads);
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    }
  }, []);

  const saveThread = useCallback(async (userId: string, threadId: string, title: string) => {
    try {
      const newThread = { userId, threadId, title, type: 'thread' };
      await fetch('/api/saveToPg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThread),
      });
      setThreads((prevThreads) => [...prevThreads, { id: threadId, title }]);
    } catch (error) {
      console.error('Failed to save thread:', error);
    }
  }, []);

  // Define the saveThreadOnClose function with sendBeacon
  const saveThreadOnClose = useCallback(async (userId: string, threadId: string, title: string) => {
    if (!userId || !threadId) {
      console.warn('User ID or Thread ID is missing, skipping save');
      return;
    }
  
    try {
      // Fetch the current threads for the user from the database
      const response = await fetch(`/api/getThreads?userId=${userId}`);
      const data = await response.json();
  
      // Map the API response to match the Thread interface
      const threads: Thread[] = data.threads.map((thread: { thread_id: string, title: string }) => ({
        id: thread.thread_id,
        title: thread.title,
      }));
  
      // Log to check if the thread exists in the database
      console.log('Checking for thread:', threadId);
  
      // Check if the current thread is already saved in the database
      const existingThread = threads.find((thread) => thread.id === threadId);
  
      if (!existingThread) {
        // If the thread doesn't exist, save it
        const payload = JSON.stringify({ userId, threadId, title });
        navigator.sendBeacon('/api/saveToPg', payload);
        console.log('Thread saved:', threadId);
      } else {
        console.log('Thread already exists, skipping save:', threadId);
      }
    } catch (error) {
      console.error('Error checking or saving thread:', error);
    }
  }, []);    

  const addThread = useCallback((thread: Thread) => {
    setThreads((prevThreads) => [...prevThreads, thread]);
  }, []);

  return (
    <ThreadsContext.Provider value={{ threads, fetchThreads, saveThread, saveThreadOnClose, addThread }}>
      {children}
    </ThreadsContext.Provider>
  );
};

export const useThreads = (): ThreadsContextType => {
  const context = useContext(ThreadsContext);
  if (context === undefined) {
    throw new Error('useThreads must be used within a ThreadsProvider');
  }
  return context;
};
