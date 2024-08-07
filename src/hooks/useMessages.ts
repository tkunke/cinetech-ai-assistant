import { useState, useEffect, useRef, useCallback } from 'react';

interface Message {
  id: string;
  role: string;
  content: string;
  imageUrl?: string;
}

export function useMessages(threadId: string | null, runCompleted: boolean) {
  const isBrowser = typeof window !== 'undefined';
  const initialMessages: Message[] = isBrowser ? JSON.parse(sessionStorage.getItem('chatMessages') || '[]') : [];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/cinetech-assistant?threadId=${threadId}`);
      const data = await response.json();
      // Only update if there are new messages
      if (JSON.stringify(data.messages) !== JSON.stringify(messages)) {
        console.log('Fetched messages:', data.messages);
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [threadId, messages]);

  useEffect(() => {
    if (!runCompleted) {
      fetchMessages();
      intervalRef.current = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [threadId, fetchMessages, runCompleted]);

  useEffect(() => {
    if (runCompleted && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [runCompleted]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const addMessage = useCallback((newMessage: Message) => {
    setMessages((prevMessages: Message[]) => {
      const updatedMessages = [...prevMessages, newMessage];
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('chatMessages', JSON.stringify(updatedMessages));
      }
      return updatedMessages;
    });
  }, []);

  return { messages, fetchMessages, loading, setMessages, addMessage };
}
