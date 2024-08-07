'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import CinetechAssistantMessage from './assistant-message';
import InputForm from './input-form';
import Sidebar from './sidebar';
import styles from '@/styles/cinetech-assistant.module.css';
import { generatePdfWithSelectedMessages } from '@/utils/generateShotSheet';
import SpinningReels from './spinning-reels';
import axios from 'axios';

function containsMarkdown(content) {
  return /(\*\*|__|`|#|\*|-|\||\n[\-=\*]{3,}\s*$)/.test(content.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, ''));
}

export default function CinetechAssistant({
  assistantId,
  greeting = 'I am a helpful chat assistant. How can I help you?',
  selectedMessages,
  setSelectedMessages,
  setThreadId,
  setRunId,
  setTokenUsage
}) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : '';
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadIdLocal] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesLibrary, setMessagesLibrary] = useState([]);
  const [imageLibrary, setImageLibrary] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState({
    role: 'assistant',
    content: 'Thinking...',
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [chunkCounter, setChunkCounter] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageEngineMap, setImageEngineMap] = useState({});
  const [runCompleted, setRunCompleted] = useState(false);
  const [showLoadingGif, setShowLoadingGif] = useState(false);
  const intervalRef = useRef(null);

  const dynamicGreeting = session?.user.default_greeting || greeting;
  const assistantName = session?.user?.assistant_name;

  const greetingMessage = {
    id: 'initial_greeting',
    role: 'assistant',
    content: dynamicGreeting,
  };

  const bufferRef = useRef('');

  // Use a useEffect to initialize messages from sessionStorage to ensure it only runs on the client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = sessionStorage.getItem('chatMessages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        console.log('Parsed messages from session storage:', parsedMessages);
        setMessages(parsedMessages);
      }
    }
  }, []);

  useEffect(() => {
    // Save messages to session storage whenever they change
    if (typeof window !== 'undefined') {
      console.log('Saving messages to session storage:', messages);
      sessionStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const addToMessagesLibrary = (message) => {
    setMessagesLibrary((prevLibrary) => {
      const updatedLibrary = [...prevLibrary, message];
      console.log('Updated messages library:', updatedLibrary); // Debugging line
      return updatedLibrary;
    });
  };

  const addToImageLibrary = (image) => {
    setImageLibrary((prevLibrary) => {
      const updatedLibrary = [...prevLibrary, image];
      console.log('Updated image library:', updatedLibrary); // Debugging line
      return updatedLibrary;
    });
  };

  const handleGeneratePdf = () => {
    console.log('Selected messages:', selectedMessages);
    generatePdfWithSelectedMessages(selectedMessages);
    setSelectedMessages([]); // Deselect messages after PDF generation
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
      setThreadIdLocal(data.threadId);
      return data.threadId;
    } catch (error) {
      console.error('Error initializing thread:', error);
    }
  }

  async function handleSubmit(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    setStreamingMessage({
      role: 'assistant',
      content: 'Thinking...',
    });

    setIsLoading(true);

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: 'temp_user',
        role: 'user',
        content: prompt,
      },
    ]);
    setPrompt('');
    setSelectedFile(null); // Clear the file input after submission
    // Reset the height of the textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      let currentThreadId = threadId;

      if (!currentThreadId) {
        currentThreadId = await initializeThread(selectedFile);
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

      const reader = response.body.getReader();
      let contentSnapshot = '';
      const decoder = new TextDecoder();
      let processingCompleted = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const strChunk = decoder.decode(value, { stream: true }).trim();
        const strServerEvents = strChunk.split('\n\n');

        for (const strServerEvent of strServerEvents) {
          if (strServerEvent) {
            try {
              const serverEvent = JSON.parse(strServerEvent);
              switch (serverEvent.event) {
                case 'thread.message.created':
                  setThreadId(serverEvent.data.thread_id);
                  setThreadIdLocal(serverEvent.data.thread_id);
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

                    setMessages((prevMessages) => [
                      ...prevMessages,
                      newImageMessage,
                    ]);

                    setImageEngineMap((prevMap) => ({
                      ...prevMap,
                      [imageUrl]: engine,
                    }));
                    console.log('Image Engine Set: ', engine);

                    setChunkCounter((prevCounter) => prevCounter + 1);
                    scrollToBottom();
                  }
                  break;
                case 'thread.processing.completed':
                  processingCompleted = true;
                  break;
              }
            } catch (error) {
              console.error('Error parsing server event:', error, strServerEvent);
            }
          }
        }
      }

      await fetchMessages(currentThreadId);

      if (!processingCompleted) {
        pollForRunStatus(currentThreadId); // Start polling for run status
      }
    } catch (error) {
      console.error(`Error during request with thread ID: ${threadId}`, error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function fetchMessages(threadId) {
    try {
      const messagesResponse = await fetch('/api/cinetech-assistant?' + new URLSearchParams({
        threadId: threadId
      }));
      const allMessages = await messagesResponse.json();
      setMessages(allMessages.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  const fetchCurrentTokenCount = async (userId) => {
    try {
      const response = await fetch(`/api/fetch-tokens?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        //console.log(`Fetched current token count for user ${userId}: ${data.tokenCount}`);
        return data.tokenCount;
      } else {
        console.error('Failed to fetch current token count:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error fetching current token count:', error);
      return null;
    }
  };
  
  const updateTokensInDatabase = async (userId, newTokenCount) => {
    try {
      console.log(`Updating tokens in database for user: ${userId} with new token count: ${newTokenCount}`);
      const response = await fetch('/api/fetch-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, tokensUsed: newTokenCount }),
      });
      const result = await response.json();
      if (response.ok) {
        //console.log('Token count updated successfully:', result);
      } else {
        console.error('Failed to update token count:', result.message);
      }
    } catch (error) {
      console.error('Error updating token count:', error);
    }
  };
  

  async function pollForRunStatus(threadId) {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch('/api/cinetech-assistant?' + new URLSearchParams({
          threadId: threadId
        }));
        const { messages, runStatus, tokenUsage } = await statusResponse.json();
  
        setMessages(messages);
  
        if (runStatus) {
          console.log('Polling run status:', runStatus);

          if (runStatus.status === 'requires_action') {
            setShowLoadingGif(true); // Show the loading GIF
          }
  
          if ((runStatus.status === 'completed' && tokenUsage) || runStatus.failed) {
            clearInterval(interval);
  
            if (runStatus.failed) {
              console.log('Run failed detected');
              setMessages(prevMessages => [
                ...prevMessages,
                {
                  id: `error_${Date.now()}`,
                  role: 'assistant',
                  content: "It looks like I had difficulty completing that last task. Please try it again."
                }
              ]);
            } else {
              setTokenUsage(tokenUsage);
  
              if (tokenUsage && tokenUsage.total_tokens !== undefined) {
                const currentTokenCount = await fetchCurrentTokenCount(session.user.id);
                if (currentTokenCount !== null) {
                  const newTokenCount = currentTokenCount - tokenUsage.total_tokens;
  
                  await updateTokensInDatabase(session.user.id, newTokenCount);
                }
              } else {
                console.error('Invalid tokenUsage:', tokenUsage);
              }
            }
            // Mark the run as completed and log it
            console.log('Run completed. Updating runCompleted state to true.');
            setRunCompleted(true);
            setShowLoadingGif(false);
          }
        }
  
      } catch (error) {
        console.error('Error polling for run status:', error);
      }
    }, 1000);
  }

  useEffect(() => {
    const fetchMessagesOnce = async () => {
      if (runCompleted && threadId) {
        console.log("Run completed. Fetching messages one last time.");
        await fetchMessages(threadId);
      }
    };

    fetchMessagesOnce();
  }, [runCompleted, threadId]);

  useEffect(() => {
    const fetchEngineInfo = async (imageUrl) => {
      try {
        console.log('Fetching engine info for:', imageUrl);
        const response = await fetch(`/api/cinetech-assistant?type=engineInfo&imageUrl=${encodeURIComponent(imageUrl)}`);
        const data = await response.json();
        if (data.engine) {
          setImageEngineMap((prevMap) => {
            const newMap = { ...prevMap, [imageUrl]: data.engine };
            console.log('Updated imageEngineMap:', newMap);  // Log the updated map
            return newMap;
          });
        }
      } catch (error) {
        console.error('Error fetching engine info:', error);
      }
    };
  
    messages.forEach((message) => {
      const imageUrlMatch = message.content.match(/!\[image\]\((.*?)\)/i);  // Case-insensitive regex for 'image'
      if (imageUrlMatch && imageUrlMatch[1]) {
        console.log('Image URL found:', imageUrlMatch[1]);  // Log the found image URL
        fetchEngineInfo(imageUrlMatch[1]);
      }
    });
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, chunkCounter, scrollToBottom]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      //console.log('New messages state:', JSON.stringify(messages, null, 2));
    }
  }, [messages]);

  useEffect(() => {
    const handleSessionEnd = async () => {
      try {
        const response = await fetch('/api/cleanup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (data.error) {
          console.error('Cleanup failed:', data.error);
        } else {
          console.log('Cleanup successful');
        }
      } catch (error) {
        console.error('Error calling cleanup endpoint:', error);
      }
    };
  
    if (!session) {
      handleSessionEnd();
    }
  
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleSessionEnd);
      return () => {
        window.removeEventListener('beforeunload', handleSessionEnd);
      };
    }
  }, [session]);  

  function handlePromptChange(e) {
    setPrompt(e.target.value);
  }

  function handleFileChange(file) {
    setSelectedFile(file);
  }

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col mb-10 items-center justify-center">
        <CinetechAssistantMessage 
          message={greetingMessage}
          assistantName={assistantName}
        />
        {messages.map((m) => (
          <CinetechAssistantMessage
            key={m.id}
            message={{
              ...m,
              isMarkdown: containsMarkdown(m.content),
              imageUrl: m.imageUrl,
            }}
            selectedMessages={selectedMessages || []}
            setSelectedMessages={setSelectedMessages}
            addToImageLibrary={addToImageLibrary}
            addToMessagesLibrary={addToMessagesLibrary}
            assistantName={assistantName}
            imageEngineMap={imageEngineMap}
          />
        ))}
        {isLoading && <CinetechAssistantMessage message={streamingMessage} />}
        <div ref={messagesEndRef} style={{ height: '1px' }}></div>
      </div>
      <Sidebar
        generatePdf={handleGeneratePdf}
        imageLibrary={imageLibrary}
        messagesLibrary={messagesLibrary}
        userId={userId}
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
