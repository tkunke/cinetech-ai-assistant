'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CinetechAssistantMessage from './assistant-message';
import InputForm from './input-form';
import Sidebar from './sidebar';
import EphemeralGreeting from './EphemeralGreeting';
import DancingEllipsis from './DancingEllipsis';
import styles from '@/styles/cinetech-assistant.module.css';
import SpinningReels from './spinning-reels';
import { useThreads } from '@/context/ThreadsContext';
import { useUser } from '@/context/UserContext';
import { parse } from 'node-html-parser';

function containsMarkdown(content) {
  return /(\*\*|__|`|#|\*|-|\||\n[\-=\*]{3,}\s*$)/.test(content.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, ''));
}

export default function CinetechAssistant({
  assistantId,
  selectedMessages,
  setSelectedMessages,
  resetMessagesRef,
  passFilteredMessagesToParent,
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : '';
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const { appUsed, handleStartUsingApp } = useUser();
  const [prompt, setPrompt] = useState(''); 
  const [messages, setMessages] = useState([]);
  const [messagesUpdated, setMessagesUpdated] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState({
    role: 'assistant',
    content: '',
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [chunkCounter, setChunkCounter] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [runCompleted, setRunCompleted] = useState(false);
  const [showLoadingGif, setShowLoadingGif] = useState(false);
  const [runId, setRunId] = useState(null);
  const [readerDone, setReaderDone] = useState(false);
  const [earliestMessageId, setEarliestMessageId] = useState(null);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);


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
          const filteredMessages = JSON.parse(savedMessages).filter((msg) => msg.status !== 'failed');
          setMessages(filteredMessages); // Only set non-failed messages
        }
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined') {
      const validMessages = messages.filter((msg) => msg.status !== 'failed');
      sessionStorage.setItem('chatMessages', JSON.stringify(validMessages));
    }
  }, [messages]);  

  const handleThreadSelect = async (selectedThreadId) => {
    setShowLoadMoreButton(false);
    setThreadId(selectedThreadId);
    setRunCompleted(true);
    
    const response = await fetch('/api/cinetech-assistant?' + new URLSearchParams({
      threadId: selectedThreadId,
    }));
    
    const data = await response.json();
    setMessages(data.messages);
    if (data.messages.length > 0) {
      setEarliestMessageId(data.messages[0].id);
    }
  
    console.log('Messages updated:', data.messages);
    updateLoadMoreButtonVisibility();
  };

  const updateLoadMoreButtonVisibility = () => {
    console.log('Updating load more button visibility. Current message count:', messages.length);
    if (messages.length >= 100) {
      setShowLoadMoreButton(true);
    } else {
      setShowLoadMoreButton(false);
    }
  };
  
  const loadMoreMessages = async () => {
    if (earliestMessageId) {
        console.log('Fetching messages with afterMessageId:', earliestMessageId);

        const response = await fetch('/api/cinetech-assistant?' + new URLSearchParams({
            threadId: threadId,
            afterMessageId: earliestMessageId, // Use 'afterMessageId' to fetch messages after the earliest message
        }));

        const data = await response.json();
        console.log('Fetched messages:', data.messages);

        setMessages((prevMessages) => {
            const existingMessageIds = new Set(prevMessages.map(msg => msg.id));
            const newMessages = data.messages.filter(msg => !existingMessageIds.has(msg.id));
            return [...newMessages, ...prevMessages]; // Prepend new messages to the existing ones
        });

        // Update earliestMessageId to the last message of the newly fetched messages
        if (data.messages.length > 0) {
            setEarliestMessageId(data.messages[data.messages.length - 1].id); // Update to the last message in the new set
        } else {
            // Hide the button if no new messages are retrieved
            setShowLoadMoreButton(false);
        }
    }
  };

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
  
    const messagesAdded = sessionStorage.getItem('messagesAdded') === 'true';
    if (!messagesAdded) {
      sessionStorage.setItem('messagesAdded', 'true');
    }
  
    setStreamingMessage({
      role: 'assistant',
      content: <DancingEllipsis />,
    });
  
    setIsLoading(true);
    
    const newMessage = {
      id: `temp_user_${Date.now()}`,
      role: 'user',
      content: prompt,
      status: 'pending',
    };
  
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setPrompt('');
    setSelectedFile(null);
  
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
  
      // Set up AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
  
      const response = await fetch('/api/cinetech-assistant', {
        method: 'POST',
        body: formData,
        signal: controller.signal,  // Attach signal for aborting
      });
  
      clearTimeout(timeoutId);  // Clear the timeout if the request succeeds
  
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
                    const newImageMessage = {
                      id: `image_${Date.now()}`,
                      role: 'assistant',
                      content: `![image](${imageUrl})`,
                      imageUrl: imageUrl,
                    };
  
                    setMessages((prevMessages) => [...prevMessages, newImageMessage]);

                    const img = new Image();
                    img.src = imageUrl;
                                    
                    img.onload = () => {
                      setTimeout(() => {
                        scrollToBottom();
                      }, 100);
                    };
                  }
                  break;
                case 'thread.run.completed':
                  setRunCompleted(true);
  
                  setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                      msg.role === 'user' && msg.status === 'pending' ? { ...msg, status: 'replied' } : msg
                    )
                  );
                  break;
              }
            } catch (error) {
              console.error('Error parsing server event:', error, strServerEvent);
            }
          }
        }
      }
  
      console.log('Fetching messages for thread ID:', currentThreadId);
      await fetchMessages(currentThreadId);
  
    } catch (error) {
      console.error('Error during message submission:', error);
  
      // Handle errors or timeouts by marking the message as 'failed'
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: 'failed' } : msg
        )
      );
  
      setStreamingMessage({
        role: 'assistant',
        content: error.message || 'Sorry, something went wrong. Please try again later.',
      });
  
      // Retry logic if there is an error
      const success = await handleRetry(newMessage.id);
      if (!success) {
        // Instead of deleting the message, just leave it in the state with 'failed' status
        console.log('Message retry failed. Leaving message in state as "failed".');

      }
    } finally {
      setIsLoading(false);
    }
  }    
  
  const handleRetry = async (messageId) => {
    const messageToRetry = messages.find((msg) => msg.id === messageId);
    if (!messageToRetry) return;
  
    try {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'pending' } : msg
        )
      );
  
      const formData = new FormData();
      formData.append('assistantId', assistantId);
      formData.append('threadId', threadId);
      formData.append('content', messageToRetry.content);
  
      const response = await fetch('/api/cinetech-assistant', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Failed to retry the message.');
      }
  
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'replied' } : msg
        )
      );
    } catch (error) {
      console.error('Retry failed:', error);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };  

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

  async function fetchMessages(threadId) {
    if (!threadId) {
      console.error('Cannot fetch messages: threadId or runId is null or undefined');
      return;
    }

    try {
      const messagesResponse = await fetch('/api/cinetech-assistant?' + new URLSearchParams({ threadId }));
      const response = await messagesResponse.json();
  
      if (response.status === 'timeout') {
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

                if (response.runStatus.status === 'completed') {
                    clearInterval(pollInterval);
                    setRunCompleted(true);
                    setShowLoadingGif(false);
                    setMessagesUpdated(true);
                    await fetchMessages(threadId);
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
    updateLoadMoreButtonVisibility();
  }, [messages]);

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
      messages.map((m) => {
        // Clone the message and preserve existing properties
        const updatedMessage = {
          ...m,
          isMarkdown: containsMarkdown(m.content),
          metadata: { ...m.metadata }, // Ensure we don't overwrite existing metadata
        };
  
        // Check for "Storyboard Breakdown" as plain text
        if (m.content.includes('Storyboard Breakdown')) {
          updatedMessage.metadata.breakdownMessage = true;
        }
  
        // Regex to match "Panel X:" pattern (X being any number) in plain text
        const panelMatch = m.content.match(/Panel \d+:/);
        
        // Regex to find image URLs in Markdown
        const imagePattern = /!\[.*?\]\((.*?)\)/g;
        const imageMatches = [...m.content.matchAll(imagePattern)];
  
        // If we find a "Panel X:" and an image is present in the message, add the metadata
        if (panelMatch && imageMatches.length > 0) {
          updatedMessage.metadata.panelMessage = true;
        }
  
        // Log the updated message for debugging purposes
        console.log('Updated Message:', updatedMessage);
        return updatedMessage;
      }),
    [messages]
  );

  // Define refs at the top level of the component, not inside useEffect
  const prevBreakdownMessages = useRef([]);
  const prevPanelMessages = useRef([]);

  useEffect(() => {
    if (passFilteredMessagesToParent) {
      const breakdownMessages = memoizedMessages.filter(
        (message) => message.metadata?.breakdownMessage
      );
      const panelMessages = memoizedMessages.filter(
        (message) => message.metadata?.panelMessage
      );

      // Check if filtered messages actually changed before passing them
      const hasBreakdownChanged = JSON.stringify(breakdownMessages) !== JSON.stringify(prevBreakdownMessages.current);
      const hasPanelChanged = JSON.stringify(panelMessages) !== JSON.stringify(prevPanelMessages.current);

      if (hasBreakdownChanged || hasPanelChanged) {
        passFilteredMessagesToParent({ breakdownMessages, panelMessages });
        prevBreakdownMessages.current = breakdownMessages; // Store the current breakdown messages
        prevPanelMessages.current = panelMessages; // Store the current panel messages
      }
    }
  }, [memoizedMessages, passFilteredMessagesToParent]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (runId && threadId) {
        const payload = JSON.stringify({ runId, threadId });
        navigator.sendBeacon('/api/cancelRun', payload);
        console.log('Run cancel request sent');
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
  
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [runId, threadId]);

  useEffect(() => {
    console.log('Messages:', messages);
  }, [messages]);

  return (
    <div className="flex flex-col h-full justify-between">
      {appUsed ? (
        <>
          <div className="flex flex-col mb-10 items-center justify-center">
            {/* Conditional rendering for Load More Messages button */}
            {showLoadMoreButton && (
              <>
              {console.log('Rendering Load More Messages button')}
              <button onClick={loadMoreMessages} className="loadMoreButton">
                Load More Messages
              </button>
              </>
            )}
            {messages.map((message) => (
              <CinetechAssistantMessage
                key={message.id}
                message={message}
                status={message.status}
                runCompleted={runCompleted}
                handleRetry={handleRetry}
                selectedMessages={selectedMessages}
                setSelectedMessages={setSelectedMessages}
                assistantName={session?.user?.assistant_name}
              />
            ))}
            {isLoading && <CinetechAssistantMessage message={streamingMessage} />}
            <div ref={messagesEndRef} style={{ height: '1px' }}></div>
          </div>
        </>
      ) : (
        <EphemeralGreeting onSelectThread={handleThreadSelect} />
      )}
      <Sidebar
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