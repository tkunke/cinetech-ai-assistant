'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import CinetechAssistantMessage from './assistant-message';
import InputForm from './input-form';
import Sidebar from './sidebar';
import styles from '@/styles/cinetech-assistant.module.css';
import SpinningReels from './spinning-reels';
import { useThreads } from '@/context/ThreadsContext';

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
  const [prompt, setPrompt] = useState(''); 
  const [messages, setMessages] = useState([]);
  const [messagesLibrary, setMessagesLibrary] = useState([]);
  const [messagesUpdated, setMessagesUpdated] = useState(false);
  const [imageLibrary, setImageLibrary] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState({
    role: 'assistant',
    content: 'Thinking...',
  });
  const [showGreeting, setShowGreeting] = useState(false);
  const [salutation, setSalutation] = useState('');
  const [dynamicGreeting, setDynamicGreeting] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [chunkCounter, setChunkCounter] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageEngineMap, setImageEngineMap] = useState({});
  const [runCompleted, setRunCompleted] = useState(false);
  const [showLoadingGif, setShowLoadingGif] = useState(false);
  const [runId, setRunId] = useState(null);
  const [readerDone, setReaderDone] = useState(false);

  const { saveThread, threads } = useThreads();

  const assistantName = session?.user?.assistant_name;
  const userName = session?.user?.name || 'User';
  const userFirstName = session?.user?.first_name || userName;

  const handleInteraction = useCallback(() => {
    setShowGreeting(false);
  }, []);

  useEffect(() => {
    // Check if the greeting has already been shown in this session
    const greetingShown = sessionStorage.getItem('greetingShown');

    if (!greetingShown) {
      // Show the greeting if it hasn't been shown yet
      setShowGreeting(true);

      // Set the flag in sessionStorage to prevent showing it again
      sessionStorage.setItem('greetingShown', 'true');
    }
  }, []);

  useEffect(() => {
    // Attach event listeners to hide greeting on interaction
    const hideGreetingOnInteraction = () => {
      setShowGreeting(false);
    };

    window.addEventListener('click', hideGreetingOnInteraction);
    window.addEventListener('keydown', hideGreetingOnInteraction);

    return () => {
      window.removeEventListener('click', hideGreetingOnInteraction);
      window.removeEventListener('keydown', hideGreetingOnInteraction);
    };
  }, []);

  const saveCurrentThreadIfNeeded = useCallback(async () => {
    if (threadId && userId) {
      // Fetch the current threads from the database
      const response = await fetch(`/api/getThreads?userId=${userId}`);
      const data = await response.json();
  
      console.log('Checking for thread:', threadId);
      // Check if the current thread is already saved in the database
      const existingThread = data.threads.find(thread => thread.thread_id === threadId);
  
      if (!existingThread) {
        const title = `Started ${new Date().toLocaleString()}`;
        await saveThread(userId, threadId, title);
      }
    }
  }, [threadId, userId, saveThread]);  

  useEffect(() => {
    const getSalutation = () => {
      const currentHour = new Date().getHours();

      if (currentHour < 12) {
        return 'Good morning';
      } else if (currentHour < 18) {
        return 'Good afternoon';
      } else {
        return 'Good evening';
      }
    };

    setSalutation(getSalutation());
  }, [userName]);

  useEffect(() => {
    const loadGreetings = async () => {
      try {
        const response = await fetch('/greetingMessages.json');
        const greetings = await response.json();
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        setDynamicGreeting(`${salutation}, ${userFirstName}! ${randomGreeting}`);
      } catch (error) {
        console.error('Error loading greetings:', error);
      }
    };

    if (salutation) {
      loadGreetings();
    }
  }, [salutation, userFirstName]);

  const handlePromptChange = useCallback((e) => {
    setPrompt(e.target.value);
    if (showGreeting) {
      setShowGreeting(false); // Hide the greeting when the user starts typing
    }
  }, [showGreeting]);

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
    fetchMessages(threadId);
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
                    setImageEngineMap((prevMap) => ({ ...prevMap, [imageUrl]: engine }));
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
  
      await fetchMessages(currentThreadId);
  
    } catch (error) {
      console.error(`Error during request with thread ID: ${threadId}`, error);
      setStreamingMessage({
        role: 'assistant',
        content: 'Sorry, there seems to be an issue processing your request. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  }  
  
  async function fetchMessages(threadId) {
    if (!threadId) {
      console.error('Cannot fetch messages: threadId is null or undefined');
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
    if (readerDone) {
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
                console.log('Polling run status:', response.runStatus);

                if (response.runStatus.status === 'completed') {
                    clearInterval(pollInterval);
                    console.log('Run completed detected during polling');
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
    const fetchEngineInfo = async (imageUrl) => {
      try {
        //console.log('Fetching engine info for:', imageUrl);
        const response = await fetch(`/api/cinetech-assistant?type=engineInfo&imageUrl=${encodeURIComponent(imageUrl)}`);
        const data = await response.json();
        if (data.engine) {
          setImageEngineMap((prevMap) => ({ ...prevMap, [imageUrl]: data.engine }));
        }
      } catch (error) {
        console.error('Error fetching engine info:', error);
      }
    };

    messages.forEach((message) => {
      const imageUrlMatch = message.content.match(/!\[image\]\((.*?)\)/i);  // Case-insensitive regex for 'image'
      if (imageUrlMatch && imageUrlMatch[1]) {
        //console.log('Image URL found:', imageUrlMatch[1]);  // Log the found image URL
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
    const handleSessionEnd = async () => {
      if (threadId && userId) {
        const newThread = {
          userId,
          threadId,
          title: `Thread ${new Date().toLocaleString()}`,
        };
        await addThread(newThread);
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
  }, [session, threadId, userId]);

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

  return (
    <div className="flex flex-col h-full justify-between">
      {showGreeting && (
        <div className={styles.greetingOverlay}>
          <p className={styles.greetingMessage}>{dynamicGreeting}</p>
        </div>
      )}
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
            imageEngineMap={imageEngineMap}
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
