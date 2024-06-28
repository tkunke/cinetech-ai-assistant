import React, { useState, useRef } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from '@/styles/assistant-message.module.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { AiOutlineDownload } from 'react-icons/ai';
import { FaFilm, FaImages } from 'react-icons/fa';

export default function CinetechAssistantMessage({ message, selectedMessages = [], setSelectedMessages, addToImageLibrary }) {
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

  const handleMessageSelect = (message) => {
    setSelectedMessages((prevSelectedMessages) =>
      prevSelectedMessages.some(m => m.id === message.id)
        ? prevSelectedMessages.filter(m => m.id !== message.id)
        : [...prevSelectedMessages, message]
    );
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
      <div className="relative-container" style={{ position: 'relative' }}>
        <img src={src} alt={alt} className="mx-auto my-2 rounded-lg" />
        <div
          className="download-button"
          onClick={() => handleDownloadImage(src)}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: 'gray',
            fontSize: '1.75rem',
            cursor: 'pointer',
          }}
          title='Download as png'
        >
          <AiOutlineDownload />
        </div>
        <div
          className="add-to-library-button"
          onClick={() => addToImageLibrary(src)}
          style={{
            position: 'absolute',
            top: '50px', // Position it below the download button
            left: '10px',
            color: 'gray',
            fontSize: '1.75rem',
            cursor: 'pointer',
          }}
          title="Add to Image Library"
        >
          <FaImages />
        </div>
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

  return (
    <div
      className={`${styles.messageContainer} ${
        message.role === 'user' ? styles.selfStart : isImageMessage ? styles.selfCenter : styles.selfStart
      } text-gray-700 text-left px-4 py-2 m-2 bg-opacity-100`}
    >
      <div className="flex flex-col items-start relative">
        <div className="text-4xl" style={{ userSelect: 'text' }}>{displayRole(message.role)}</div>
        {(isImageMessage || isBreakdownMessage) && (
          <div
            className="select-button"
            onClick={() => handleMessageSelect(message)}
            style={{
              color: selectedMessages.some(m => m.id === message.id) ? 'red' : 'gray',
              fontSize: '1.75rem',
              cursor: 'pointer',
            }}
            title='Add to shot sheet'
          >
            <FaFilm />
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
