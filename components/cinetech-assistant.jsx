'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CinetechAssistantMessage from './assistant-message';
import InputForm from './input-form';
import Sidebar from './sidebar';
import EphemeralGreeting from './EphemeralGreeting';
import styles from '@/styles/cinetech-assistant.module.css';
import SpinningReels from './spinning-reels';
import { useThreads } from '@/context/ThreadsContext';
import { useUser } from '@/context/UserContext';

function containsMarkdown(content) {
  return /(\*\*|__|`|#|\*|-|\||\n[\-=\*]{3,}\s*$)/.test(content.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, ''));
}

export default function CinetechAssistant({
  assistantId,
  selectedMessages,
  setSelectedMessages,
  resetMessagesRef,
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : '';
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const { appUsed, handleStartUsingApp } = useUser();
  const [prompt, setPrompt] = useState(''); 
  const [messages, setMessages] = useState([]);
  const [messagesLibrary, setMessagesLibrary] = useState([]);
  const [messagesUpdated, setMessagesUpdated] = useState(false);
  const [imageLibrary, setImageLibrary] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState({
    role: 'assistant',
    content: 'Thinking...',
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [chunkCounter, setChunkCounter] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [runCompleted, setRunCompleted] = useState(false);
  const [showLoadingGif, setShowLoadingGif] = useState(false);
  const [runId, setRunId] = useState(null);
  const [readerDone, setReaderDone] = useState(false);

  const { saveThread } = useThreads();

  const userName = session?.user?.name || 'User';

  useEffect(() => {
    const generateSynopsis = async () => {
      try {
        const response = await fetch(`/api/generateThreadSynopsis?threadId=${threadId}`, {
          method: 'GET',
        });

        if (!response.ok) {
          throw new Error('Failed to generate synopsis');
        }

        const data = await response.json();
        console.log('Generated Synopsis:', data.synopsis);
      } catch (error) {
        console.error('Error generating synopsis:', error);
      }
    };

    if (messages.length > 0 && messages.length % 10 === 0) {
      console.log('Messages array length is divisible by 10. Generating synopsis...');
      generateSynopsis();
    }
  }, [messages.length, threadId]);
  
  const saveCurrentThreadIfNeeded = useCallback(async () => {
    if (threadId && userId) {
      // Fetch the current threads from the database
      const response = await fetch(`/api/getThreads?userId=${userId}`);
      const data = await response.json();
  
      console.log('Checking for thread:', threadId);
      // Check if the current thread is already saved in the database
      const existingThread = data.threads.find(thread => thread.thread_id === threadId);
  
      if (!existingThread) {
        const title = `Saved on ${new Date().toLocaleString()}`;
        await saveThread(userId, threadId, title);
      }
    }
  }, [threadId, userId, saveThread]);

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
  }, []);

  const clearMessages = () => {
    setMessages([]);
  };

  useEffect(() => {
    if (resetMessagesRef) {
      resetMessagesRef.current = async () => {
        clearMessages();
        setThreadId(null);
        await saveCurrentThreadIfNeeded();
      };
    }
  }, [resetMessagesRef, saveCurrentThreadIfNeeded]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedThreadId = sessionStorage.getItem('threadId');
      const savedMessages = sessionStorage.getItem('chatMessages');
  
      if (savedThreadId) {
        setThreadId(savedThreadId);
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        }
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleThreadSelect = (threadId) => {
    setThreadId(threadId);
    fetchMessages(threadId, false);
  };

  const addToMessagesLibrary = useCallback((message) => {
    setMessagesLibrary((prevLibrary) => [...prevLibrary, message]);
  }, []);
  
  const addToImageLibrary = useCallback((image) => {
    setImageLibrary((prevLibrary) => [...prevLibrary, image]);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end', inline: 'nearest' });
    }
  }, []);  

  async function initializeThread() {
    try {
      const response = await fetch('/api/thread-init', {
        method: 'POST',
      });
      const data = await response.json();
      setThreadId(data.threadId);
      return data.threadId;
    } catch (error) {
      console.error('Error initializing thread:', error);
    }
  }

  async function handleSubmit(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    if (!appUsed) {
      handleStartUsingApp();
    }

    // Ensure that we don't allow submission if the previous user message was not responded to
    if (messages.length % 2 !== 0) {
      console.log('Last user message did not receive a response, retrying...');
      await retryLastUserMessage();  // Retry if there is an unpaired message
      return;
    }

    const messagesAdded = sessionStorage.getItem('messagesAdded') === 'true';
    if (!messagesAdded) {
      sessionStorage.setItem('messagesAdded', 'true');
    }
  
    setStreamingMessage({
      role: 'assistant',
      content: 'Thinking...',
    });
  
    setIsLoading(true);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `temp_user_${Date.now()}`,  // Ensure a unique key for the message
        role: 'user',
        content: prompt,
      },
    ]);

    setPrompt('');
    setSelectedFile(null); // Clear the file input after submission
  
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  
    try {
      let currentThreadId = threadId;
  
      if (!currentThreadId) {
        currentThreadId = await initializeThread();
      }
      sessionStorage.setItem('threadId', currentThreadId);

      // Save the thread in the database if it doesn't exist yet
      if (userId && currentThreadId) {
        const response = await fetch(`/api/getThreads?userId=${userId}`);
        const data = await response.json();

        const existingThread = data.threads.find(thread => thread.thread_id === currentThreadId);

        if (!existingThread) {
          const title = `Started on ${new Date().toLocaleString()}`;
          await saveThread(userId, currentThreadId, title);
          console.log('Thread saved:', currentThreadId);
        }
      }
  
      // Prepare form data
      const formData = new FormData();
      formData.append('assistantId', assistantId);
      formData.append('threadId', currentThreadId);
      formData.append('content', prompt);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
  
      const response = await fetch('/api/cinetech-assistant', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('There was a problem sending your message. Please try again later.');
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let contentSnapshot = '';  // Accumulate content here
  
      setReaderDone(false);
  
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setReaderDone(true);
          break;
        }
  
        const strChunk = decoder.decode(value, { stream: true }).trim();
        
        // Split on newline to handle individual JSON chunks
        const strServerEvents = strChunk.split('\n\n');
  
        for (const strServerEvent of strServerEvents) {
          if (strServerEvent) {
            try {
              const serverEvent = JSON.parse(strServerEvent);
  
              if (!runId && serverEvent.data.run_id) {
                setRunId(serverEvent.data.run_id);
              }
  
              switch (serverEvent.event) {
                case 'thread.message.created':
                  setThreadId(serverEvent.data.thread_id);
                  break;
                case 'thread.message.delta':
                  if (serverEvent.data.delta.content[0].text && serverEvent.data.delta.content[0].text.value) {
                    contentSnapshot += serverEvent.data.delta.content[0].text.value;
                    setStreamingMessage((prevMessage) => ({
                      ...prevMessage,
                      content: contentSnapshot,
                    }));
                    setChunkCounter((prevCounter) => prevCounter + 1);
                  }
  
                  if (serverEvent.data.delta.content[0].image && serverEvent.data.delta.content[0].image.url) {
                    const imageUrl = serverEvent.data.delta.content[0].image.url;
                    const engine = imageEngineMap[imageUrl];
                    const newImageMessage = {
                      id: `image_${Date.now()}`,
                      role: 'assistant',
                      content: `![image](${imageUrl})`,
                      imageUrl: imageUrl,
                    };
  
                    setMessages((prevMessages) => [...prevMessages, newImageMessage]);
                    scrollToBottom();
                  }
                  break;
                case 'thread.run.completed':
                  setRunCompleted(true);
                  break;
              }
            } catch (error) {
              console.error('Error parsing server event:', error, strServerEvent);
            }
          }
        }
      }
  
      await fetchMessages(currentThreadId, true);
  
    } catch (error) {
      console.error('Error during message submission:', error);
      setStreamingMessage({
        role: 'assistant',
        content: error.message || 'Sorry, something went wrong. Please try again later.',
      });

      // Retry logic if there is an error
      const success = await retryLastUserMessage();
      if (!success) {
        console.log('All retries failed, deleting the last user message.');
        // Call server to delete the message from the thread
        await deleteMessageFromThread(threadId, messageId);

        // Remove the last unpaired user message from local state
        setMessages((prevMessages) => prevMessages.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  }  
  
  // Helper function to retry the last user message
  async function retryLastUserMessage() {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'user') {
      console.log('Retrying message:', lastMessage.content);

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.log(`Attempt ${attempt} to retry message...`);

        // Retry sending the last user message
        const formData = new FormData();
        formData.append('assistantId', assistantId);
        formData.append('threadId', threadId);
        formData.append('content', lastMessage.content);

        try {
          const response = await fetch('/api/cinetech-assistant', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            console.log('Retry successful for last message.');
            return true;  // Success, exit the retry loop
          }

        } catch (retryError) {
          console.error('Retry failed:', retryError);
        }

        // Wait before the next retry
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }

    return false;  // Return false if all retries fail
  }

  // Helper function to delete the message from the thread
  async function deleteMessageFromThread(threadId, messageId) {
    try {
      const response = await fetch(`/api/deleteMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ threadId, messageId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete the message from the thread');
      }

      console.log(`Message with ID ${messageId} deleted from thread ${threadId}`);
    } catch (error) {
      console.error('Error deleting message from thread:', error);
    }
  }

  async function fetchMessages(threadId, requireRunId = false) {
    if (!threadId || (requireRunId && !runId)) {
      console.error('Cannot fetch messages: threadId or runId is null or undefined');
      return;
    }
  
    try {
      const messagesResponse = await fetch('/api/cinetech-assistant?' + new URLSearchParams({ threadId }));
      const response = await messagesResponse.json();
  
      if (response.status === 'timeout') {
        // Inform the user about the timeout
        setStreamingMessage({
          role: 'assistant',
          content: 'The operation timed out. Please try again later.',
        });
      } else {
        setMessages(response.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setStreamingMessage({
        role: 'assistant',
        content: 'An error occurred while fetching the assistant’s response. Please try again later.',
      });
      setIsLoading(false);
      setShowLoadingGif(false);
    }
  }  

  useEffect(() => {
    if (readerDone && runId) {
        const pollInterval = setInterval(async () => {
            try {
              //console.log('Polling with threadId:', threadId, 'and runId:', runId);
                const statusResponse = await fetch('/api/cinetech-assistant?' + new URLSearchParams({
                    threadId: threadId,
                    runId: runId
                }));
                const response = await statusResponse.json();
                setShowLoadingGif(true);
                setMessagesUpdated(false);

                //console.log('Full server response:', response);
                //console.log('Polling run status:', response.runStatus);

                if (response.runStatus.status === 'completed') {
                    clearInterval(pollInterval);
                    console.log('Run completed detected during polling');
                    setRunCompleted(true);
                    setShowLoadingGif(false);
                    setMessagesUpdated(true);
                    await fetchMessages(threadId, true);

                    setRunId(null);
                    setReaderDone(false);
                }
            } catch (error) {
                console.error('Error polling run status:', error);
                setStreamingMessage({
                  role: 'assistant',
                  content: 'Sorry, there was an issue generating a response. Please try again later.',
                });
                setShowLoadingGif(false); // Stop the loading indicator
                clearInterval(pollInterval);
            }
        }, 1000);

        // Clean up the interval on component unmount or when polling stops
        return () => clearInterval(pollInterval);
    }
  }, [readerDone, runId, threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, chunkCounter, scrollToBottom]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, messages]);

  const handleFileChange = useCallback((file) => {
    setSelectedFile(file);
  }, []);

  const memoizedMessages = useMemo(
    () =>
      messages.map((m) => ({
        ...m,
        isMarkdown: containsMarkdown(m.content),
        imageUrl: m.imageUrl,
      })),
    [messages]
  );

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (runId && threadId) {
        try {
          await fetch('/api/cancelRun', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ runId, threadId }),
          });
          console.log('Run canceled');
        } catch (error) {
          console.error('Failed to cancel the run:', error);
        }
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
  
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [runId, threadId]);

  useEffect(() => {
    console.log('showLoadingGif state changed:', showLoadingGif);
  }, [showLoadingGif]);

  useEffect(() => {
    console.log('Messages:', messages);
  }, [messages]);

  return (
    <div className="flex flex-col h-full justify-between">
      <EphemeralGreeting onSelectThread={handleThreadSelect}/>
      <div className="flex flex-col mb-10 items-center justify-center">
        {messages.map((message) => (
          <CinetechAssistantMessage
            key={message.id}
            message={message}
            selectedMessages={selectedMessages}
            setSelectedMessages={setSelectedMessages}
            addToImageLibrary={addToImageLibrary}
            addToMessagesLibrary={addToMessagesLibrary}
            assistantName={session?.user?.assistant_name}
          />
        ))}
        {isLoading && <CinetechAssistantMessage message={streamingMessage} />}
        <div ref={messagesEndRef} style={{ height: '1px' }}></div>
      </div>
      <Sidebar
        imageLibrary={imageLibrary}
        messagesLibrary={messagesLibrary}
        userId={userId}
        runId={runId}
        runCompleted={runCompleted}
        messagesUpdated={messagesUpdated}
        onSelectThread={handleThreadSelect}
      />
      <footer className={styles.footer}>
        {showLoadingGif && (
          <div className={`${styles['loading-container']}`}>
            <SpinningReels />
          </div>
        )}
        <InputForm
          handleSubmit={handleSubmit}
          handlePromptChange={handlePromptChange}
          prompt={prompt}
          isLoading={isLoading}
          inputRef={inputRef}
          handleFileChange={handleFileChange}
          showLoadingGif={showLoadingGif}
        />
      </footer>
    </div>
  );
}
