import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/styles/assistant-message.module.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AiOutlineDownload } from 'react-icons/ai';
import { FaFilm, FaImages, FaEnvelope, FaNewspaper } from 'react-icons/fa';

export default function CinetechAssistantMessage({ message, selectedMessages = [], setSelectedMessages, addToImageLibrary, addToMessagesLibrary }) {
  const tableRef = useRef(null);
  const buttonRef = useRef(null);
  const [showTips, setShowTips] = useState(false);

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
        return <span style={roleStyle}>User</span>;
      case 'assistant':
        return <span style={roleStyle}>CT Assistant</span>;
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
    try {
      const response = await fetch(`/api/fetch-image?url=${encodeURIComponent(imageUrl)}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const thumbnailWidth = 100; // Desired thumbnail width
        const thumbnailHeight = 100; // Desired thumbnail height

        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);

        const thumbnailUrl = canvas.toDataURL('image/png');
        addToImageLibrary({ imageUrl, thumbnailUrl });
        window.URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Error adding to image library:', error);
    }
  };

  const handleMessageSelect = (message) => {
    setSelectedMessages((prevSelectedMessages) =>
      prevSelectedMessages.some(m => m.id === message.id)
        ? prevSelectedMessages.filter(m => m.id !== message.id)
        : [...prevSelectedMessages, message]
    );
  };

  const handleSaveMessage = async (messageContent) => {
    const canvas = await html2canvas(document.body.querySelector(`#message-${message.id}`));
    const thumbnailUrl = canvas.toDataURL('image/png');
    addToMessagesLibrary({ content: messageContent, thumbnailUrl });
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
    img: ({ src, alt }) => (
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
      </div>
    ),
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
  const isBreakdownMessage = message.content.includes('Storyboard Breakdown');
  const isInitialMessage = message.content.trim() === 'Hey there! How can I help?';


  return (
    <div
      id={`message-${message.id}`}
      className={`${styles.messageContainer} ${
        message.role === 'user' ? styles.selfStart : isImageMessage ? styles.selfCenter : styles.selfStart
      } text-gray-700 text-left px-4 py-2 m-2 bg-opacity-100`}
    >
      <div className="flex flex-col items-start relative">
        <div className="text-4xl" style={{ userSelect: 'text' }}>{displayRole(message.role)}</div>
        {message.role === 'assistant' && !isInitialMessage && (
          <div className={styles.messageSidebar}>
            {(isBreakdownMessage || isImageMessage) && (
              <div className={styles.iconButton} onClick={() => handleMessageSelect(message)} title="Select Message">
                <FaFilm style={{ color: selectedMessages.some(m => m.id === message.id) ? 'red' : 'gray' }} />
              </div>
            )}
            {!hasImages(message.content) && (  // Conditionally render based on presence of images
              <div className={styles.iconButton} onClick={() => handleSaveMessage(message.content)} title="Save Message">
                <FaNewspaper />
              </div>
            )}
          </div>
        )}
        {message.content.includes('difficulty completing') && (
          <button
            className="helpfulTipsButton"
            onMouseEnter={() => setShowTips(true)}
            onMouseLeave={() => setShowTips(false)}
          >
            Helpful Tips
            {showTips && (
              <div className="helpfultips">
                <p className>Tip #1:</p>
                <ul>
                  <li>If you are asking the assistant to perform image recognition and image generation in a single request, try breaking those into two separate requests.</li>
                </ul>
              </div>
            )}
          </button>
        )}
      </div>
      <ReactMarkdown components={renderers} remarkPlugins={[remarkGfm]}>
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
