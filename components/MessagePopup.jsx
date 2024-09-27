import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactDOM from 'react-dom';
import { FaEnvelope, FaFilePdf } from 'react-icons/fa';
import styles from '@/styles/MessagePopup.module.css';
import { generatePdfFromMarkdown } from '@/utils/pdfUtils';
import { AiOutlineDownload } from 'react-icons/ai';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MessagePopup = ({ title, content, timestamp, onClose, threadId, onLoadThread }) => {
  
  // Custom renderers for tables, images, etc.
  const renderers = {
    table: ({ node, children }) => (
      <div className={styles.relativeContainer}>
        <table className="table-auto w-full">
          {children}
        </table>
        <div
          className={styles.downloadButton}
          onClick={handleDownloadTable}
          style={{ fontSize: '1.75rem', cursor: 'pointer' }} 
          title='Download as pdf'
        >
          <AiOutlineDownload />
        </div>
      </div>
    ),
    img: ({ src, alt }) => (
      <div className={styles.imageMessageContainer}>
        <img src={src} alt={alt} className={styles.image} />
        <div className={styles.imageDownloadButton} onClick={() => handleDownloadImage(src)}>
          <AiOutlineDownload /> Download Image
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
  };

  const handleDownloadPDF = (content) => {
    generatePdfFromMarkdown(content);
  };

  const handleDownloadTable = async () => {
    const tableElement = document.querySelector(`.${styles.relativeContainer} table`);
    if (tableElement) {
      const canvas = await html2canvas(tableElement);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.addImage(imgData, 'PNG', 0, 0);
      pdf.save('table.pdf');
    }
  };

  const handleDownloadImage = (imageUrl) => {
    fetch(imageUrl)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'image.png';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert('Could not download image'));
  };

  return ReactDOM.createPortal(
    <div className={styles.messagePopupOverlay}>
      <div className={styles.messagePopup}>
        <div className={styles.messagePopupHeader}>
          <div className={styles.timestamp}>{timestamp}</div>
          <div className={styles.leftButtons}>
            <button
              className={styles.emailButton}
              onClick={() => {
                const subject = encodeURIComponent('Message Content');
                const body = encodeURIComponent(content);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
            >
              <FaEnvelope />
            </button>
            <button className={styles.pdfButton} onClick={() => handleDownloadPDF(content)}>
              <FaFilePdf />
            </button>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>
        {title && <h3>{title}</h3>}
        <div className={styles.messageContent}>
          {/* Use ReactMarkdown with custom renderers */}
          <ReactMarkdown components={renderers} remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>

        {/* Conditionally render "Load Thread" button if threadId is provided */}
        {threadId && (
          <button
            className={styles.loadThreadButton}
            onClick={() => {
              onLoadThread(threadId);  // Call the function to load the thread
              onClose();  // Close the popup
            }}
          >
            Load Conversation
          </button>
        )}
        
      </div>
    </div>,
    document.body
  );
};

export default MessagePopup;
