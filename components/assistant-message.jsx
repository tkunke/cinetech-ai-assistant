import React, { useState, useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/styles/assistant-message.module.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AiOutlineDownload } from 'react-icons/ai';
import { FaFilm, FaImages, FaAsterisk, FaNewspaper, FaCheckCircle } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { upload } from '@vercel/blob/client';
import { useLibrary } from '@/context/LibraryContext';
import { useWorkspace } from '@/context/WorkspaceContext';

function CinetechAssistantMessage({ 
  message, 
  status, 
  handleRetry, 
  selectedMessages = [], 
  setSelectedMessages, 
  assistantName, 
  runCompleted,
}) {
  const tableRef = useRef(null);
  const buttonRef = useRef(null);
  const [showTips, setShowTips] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : '';
  const userName = session?.user?.name ? session.user.name : 'User';
  const { addImage, addMessage } = useLibrary();
  const { activeWorkspaceId } = useWorkspace();
  const isHighlighted = selectedMessages.some(m => m.id === message.id);

  if (!message) return null;
  if (!message.role) return null;

  const hasImages = (content) => {
    const imagePattern = /!\[.*\]\((.*)\)/;
    return imagePattern.test(content);
  };

  function displayRole(roleName) {
    const maroonRed = '#800000';
    const roleStyle = {
      fontWeight: 'bold',
      fontSize: '16px',
      color: roleName === 'assistant' ? maroonRed : 'inherit',
    };

    switch (roleName) {
      case 'user':
        return <span style={roleStyle}>{userName}</span>;
      case 'assistant':
        return <span style={roleStyle}>{assistantName}</span>;
      default:
        return null;
    }
  }

  const handleDownloadTable = async () => {
    if (tableRef.current) {
      buttonRef.current.style.display = 'none';
      const canvas = await html2canvas(tableRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('table.pdf');
      buttonRef.current.style.display = 'block';
    }
  };

  const handleDownloadImage = (imageUrl) => {
    fetch(`/api/fetch-image?url=${encodeURIComponent(imageUrl)}`)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'generated-image.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert('Could not download image'));
  };

  const handleAddToImageLibrary = async (imageUrl) => {
    if (!userId) {
      console.error('User ID is missing from session');
      return;
    }
    if (!activeWorkspaceId) {
      console.error('Active workspace ID is missing');
      return;
    }
  
    try {
      const response = await fetch(`/api/fetch-image?url=${encodeURIComponent(imageUrl)}`);
      const blob = await response.blob();
      const fileName = `generated-image.png`;
      const prefixedFileName = `${userName}-img-${fileName}`;
      const file = new File([blob], prefixedFileName, { type: 'image/png' });
  
      console.log('File name being sent:', file.name);
      console.log('Prefixed file name being sent:', prefixedFileName);
  
      const tokenResponse = await fetch('/api/image-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pathname: prefixedFileName,
          userId: userId,
        }),
      });
  
      const responseData = await tokenResponse.json();
      console.log('Response data:', responseData);
  
      const { clientToken } = responseData;
  
      if (!clientToken) {
        throw new Error('Failed to retrieve client token');
      }
  
      const newBlob = await upload(prefixedFileName, file, {
        access: 'public',
        handleUploadUrl: '/api/image-store',
        clientToken,
      });
  
      console.log('Image uploaded successfully:', newBlob);
  
      // Save image metadata to the database
      const saveResponse = await fetch('/api/saveToPg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          imageUrl: newBlob.url,
          type: 'image',
          workspaceId: activeWorkspaceId,
        }),
      });
  
      const saveData = await saveResponse.json();
      console.log('Save response data:', saveData);
  
      // Update the state with the new image
      //addImage({
      //  imageUrl: newBlob.url,
      //  thumbnailUrl: newBlob.url,
      //  tags: [],
      //});

    } catch (error) {
      console.error('Error uploading image:', error);
      if (error.response) {
        const errorData = await error.response.json();
        console.error('Error response data:', errorData);
      }
    }
  };    

  const handleSaveMessage = async (messageContent) => {
    if (!userId) {
      console.error('User ID is missing from session');
      return;
    }
    if (!activeWorkspaceId) {
      console.error('Active workspace ID is missing');
      return;
    }

    try {
      // Truncate the message to create a preview (e.g., 100 characters max)
      const previewText = messageContent.length > 100 
        ? messageContent.substring(0, 100) + '...' 
        : messageContent;

      const timestamp = generateTimestamp();
      const messageData = { content: messageContent, previewText, timestamp };
      const blob = new Blob([JSON.stringify(messageData)], { type: 'application/json' });
      const fileName = `message-${Math.random().toString(36).substr(2, 9)}.json`;
      const prefixedFileName = `${userName}-message-${fileName}`;
      const file = new File([blob], prefixedFileName, { type: 'application/json' });

      // Save the message to the server
      const tokenResponse = await fetch('/api/message-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pathname: prefixedFileName,
          userId: userId,
        }),
      });

      const responseData = await tokenResponse.json();
      const { clientToken } = responseData;

      if (!clientToken) {
        throw new Error('Failed to retrieve client token');
      }
  
      const newBlob = await upload(prefixedFileName, file, {
        access: 'public',
        handleUploadUrl: '/api/message-store',
        clientToken,
      });

      console.log('Preview of text:', previewText);
      // Save message metadata to the database
      const saveResponse = await fetch('/api/saveToPg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          messageUrl: newBlob.url,  // message URL for full content
          preview: previewText,  // truncated preview for display
          type: 'message',
          workspaceId: activeWorkspaceId,
        }),
      });

      const saveData = await saveResponse.json();

      // Update state with the new message
      addMessage({
        content: messageContent,  // Full content
        preview: previewText,  // Truncated preview
        url: newBlob.url,  // URL of the message content file
        timestamp: generateTimestamp(),
        tags: [],
      });

    } catch (error) {
      console.error('Error uploading message:', error);
    }
  };                        

  const handleMessageSelect = () => {
    setSelectedMessages(prevSelectedMessages => {
      if (prevSelectedMessages.some(m => m.id === message.id)) {
        return prevSelectedMessages.filter(m => m.id !== message.id);
      } else {
        return [...prevSelectedMessages, message];
      }
    });
  };

  const generateTimestamp = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getEngineFromImageUrl = (imageUrl) => {
    if (imageUrl.includes('openai-tmp-img')) {
      return 'DALL-E';
    } else if (imageUrl.includes('stability-tmp-img')) {
      return 'Stability AI';
    } else {
      return 'Unknown Engine';
    }
  };
  

  const renderers = {
    table: ({ node, children }) => (
      <div className="relative-container" ref={tableRef}>
        <table className="table-auto w-full">
          {children}
        </table>
        <div
          className="download-button"
          ref={buttonRef}
          onClick={handleDownloadTable}
          style={{ fontSize: '1.75rem', cursor: 'pointer' }} title='Download as pdf'
        >
          <AiOutlineDownload />
        </div>
      </div>
    ),
    img: ({ src, alt }) => {
      const engine = getEngineFromImageUrl(src);
      return (
        <div className={styles.imageMessageContainer}>
          <div className={styles.buttonSidebar}>
            <div className={styles.iconButton} onClick={() => handleDownloadImage(src)} title="Download as png">
              <AiOutlineDownload />
            </div>
            <div className={styles.iconButton} onClick={() => handleAddToImageLibrary(src)} title="Add to Image Library">
              <FaImages />
            </div>
          </div>
          <img src={src} alt={alt} className={styles.image} />
          <div className={styles.imageEngine}>
            Generated by: {engine}
          </div>
        </div>
      );
    },
    p: ({ node, children }) => {
      const hasImage = node.children.some(child => child.tagName === 'img');
      if (hasImage) {
        return <>{children}</>;
      }
      return <p>{children}</p>;
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
  };

  const isImageMessage = hasImages(message.content);
  const isBreakdownMessage = typeof message.content === 'string' && message.content.includes('Storyboard Breakdown');

  return (
    <div
      id={`message-${message.id}`}
      className={`${styles.messageContainer} ${
        message.role === 'user' ? styles.selfStart : isImageMessage ? styles.selfCenter : styles.selfStart
      } text-gray-700 text-left px-4 py-2 m-2 bg-opacity-100 ${isHighlighted ? styles.highlighted : ''}`}
    >
      <div className="flex flex-col items-start relative">
        <div className="text-4xl" style={{ userSelect: 'text' }}>{displayRole(message.role)}</div>
        {message.role === 'assistant' && message.id !== 'initial_greeting' && (
          <div className={styles.messageSidebar}>
            {(isBreakdownMessage || isImageMessage) && (
              <button
                className={styles.selectButton}
                onClick={() => handleMessageSelect(message)}
                title={isHighlighted ? 'Deselect Message' : 'Select Message'} // Update title dynamically if needed
              >
                {isHighlighted ? 'Deselect Message' : 'Select Message'}  {/* Place conditional rendering here */}
              </button>                                                     
            )}
            {runCompleted && !hasImages(message.content) && (
              <button 
                className={styles.selectButton}
                onClick={() => handleSaveMessage(message.content)}
                title="Save Message"
              >
                Save Message
              </button>
            )}
          </div>
        )}
      </div>
      {/* Conditional rendering for content */}
      {typeof message.content === 'string' ? (
        <ReactMarkdown components={renderers} remarkPlugins={[remarkGfm]}>
          {message.content}
        </ReactMarkdown>
      ) : (
        React.isValidElement(message.content) ? (
          <div>{message.content}</div> // Render the DancingEllipsis component
        ) : null // Handle the case where content is neither a string nor a valid React element
      )}
      {/* Conditionally render based on status */}
      {status === 'failed' && (
          <div>
            <p className={styles.failedMessage}>Sorry, I had trouble generating a response for this. Please try again.
              <button
                onClick={() => handleRetry(message.id)} className={styles.retryButton}>
                Retry
              </button>
            </p>
          </div>
        )}
    </div>
  );
}

export default React.memo(CinetechAssistantMessage, (prevProps, nextProps) => {
  return (
    prevProps.message === nextProps.message &&
    prevProps.selectedMessages === nextProps.selectedMessages &&
    prevProps.assistantName === nextProps.assistantName &&
    prevProps.imageEngineMap === nextProps.imageEngineMap
  );
});

