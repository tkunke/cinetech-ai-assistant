import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

interface Thread {
  id: string;
  title: string;
}

interface ThreadsContextType {
  threads: Thread[];
  fetchThreads: (userId: string) => void;
  saveThread: (userId: string, threadId: string, title: string) => Promise<void>;
  addThread: (thread: Thread) => void;
}

const ThreadsContext = createContext<ThreadsContextType | undefined>(undefined);

interface ThreadsProviderProps {
  children: ReactNode;  // Add typing for the children prop
}

export const ThreadsProvider: React.FC<ThreadsProviderProps> = ({ children }) => {
  const [threads, setThreads] = useState<Thread[]>([]);

  const fetchThreads = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/getThreads?userId=${userId}`);
      const data = await response.json();

      // Map the data to ensure 'thread_id' is used as 'id'
      const mappedThreads = data.threads.map((thread: any) => ({
        id: thread.thread_id,  // Map thread_id from the DB to id used in the context
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

  const addThread = useCallback((thread: Thread) => {
    setThreads((prevThreads) => [...prevThreads, thread]);
  }, []);

  return (
    <ThreadsContext.Provider value={{ threads, fetchThreads, saveThread, addThread }}>
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
