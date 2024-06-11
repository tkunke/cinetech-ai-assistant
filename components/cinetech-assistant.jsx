'use client';

import { useState, useEffect, useRef } from 'react';
import CinetechAssistantMessage from './assistant-message';
import InputForm from './input-form';
import styles from '../styles/cinetech-assistant.module.css';

function containsMarkdown(content) {
  return /(\*\*|__|`|#|\*|-|\||\n[\-=\*]{3,}\s*$)/.test(content.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, ''));
}

export default function CinetechAssistant({
  assistantId,
  greeting = 'I am a helpful chat assistant. How can I help you?',
  selectedMessages,
  setSelectedMessages,
  addToImageLibrary,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState(null); // Default to null
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState({
    role: 'assistant',
    content: 'Thinking...',
  });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [chunkCounter, setChunkCounter] = useState(0);

  const greetingMessage = {
    role: 'assistant',
    content: greeting,
  };

  const bufferRef = useRef('');

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

  async function handleSubmit(e) {
    e.preventDefault();

    setStreamingMessage({
      role: 'assistant',
      content: 'Thinking...',
    });

    setIsLoading(true);

    setMessages([
      ...messages,
      {
        id: 'temp_user',
        role: 'user',
        content: prompt,
      },
    ]);
    setPrompt('');
    // Reset the height of the textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      let currentThreadId = threadId;

      if (!currentThreadId) {
        currentThreadId = await initializeThread();
      }

      const response = await fetch('/api/cinetech-assistant', {
        method: 'POST',
        body: JSON.stringify({
          assistantId: assistantId,
          threadId: currentThreadId,
          content: prompt,
        }),
      });

      const reader = response.body.getReader();
      let contentSnapshot = '';
      let processingCompleted = false;
      const decoder = new TextDecoder();

      const updateContent = () => {
        setStreamingMessage((prevMessage) => ({
          ...prevMessage,
          content: contentSnapshot,
        }));
        setChunkCounter((prevCounter) => prevCounter + 1);
      };

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
                  break;
                case 'thread.message.delta':
                  if (serverEvent.data.delta.content[0].text && serverEvent.data.delta.content[0].text.value) {
                    contentSnapshot += serverEvent.data.delta.content[0].text.value;
                    bufferRef.current = contentSnapshot;
                    updateContent();
                  }

                  if (serverEvent.data.delta.content[0].image && serverEvent.data.delta.content[0].image.url) {
                    const imageUrl = serverEvent.data.delta.content[0].image.url;
                    const newImageMessage = {
                      id: `image_${Date.now()}`,
                      role: 'assistant',
                      content: `![image](${imageUrl})`,
                      imageUrl: imageUrl,
                    };

                    setMessages((prevMessages) => {
                      return [...prevMessages, newImageMessage];
                    });
                    setChunkCounter((prevCounter) => prevCounter + 1);
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

      await fetchMessages(currentThreadId); // Fetch messages immediately after POST

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

  async function pollForRunStatus(threadId) {
    const interval = setInterval(async () => {
      try {
        const statusResponse = await fetch('/api/cinetech-assistant?' + new URLSearchParams({
          threadId: threadId
        }));
        const { messages, runStatus } = await statusResponse.json();
        setMessages(messages);

        if (runStatus && runStatus.status === 'completed') {
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error polling for run status:', error);
      }
    }, 1000);
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chunkCounter]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      console.log('New messages state:', JSON.stringify(messages, null, 2));
    }
  }, [messages]);

  function handlePromptChange(e) {
    setPrompt(e.target.value);
  }

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col mb-10 items-center justify-center">
        <CinetechAssistantMessage message={greetingMessage} />
        {messages.map((m) => (
          <CinetechAssistantMessage
            key={m.id}
            message={{
              ...m,
              isMarkdown: containsMarkdown(m.content),
              imageUrl: m.imageUrl,
            }}
            selectedMessages={selectedMessages || []} // Pass selectedMessages
            setSelectedMessages={setSelectedMessages} // Pass setSelectedMessages
            addToImageLibrary={addToImageLibrary}
          />
        ))}
        {isLoading && <CinetechAssistantMessage message={streamingMessage} />}
        <div ref={messagesEndRef} style={{ height: '1px' }}></div>
      </div>
      <footer className={styles.footer}>
        <InputForm
          handleSubmit={handleSubmit}
          handlePromptChange={handlePromptChange}
          prompt={prompt}
          isLoading={isLoading}
          inputRef={inputRef}
        />
      </footer>
    </div>
  );
}
