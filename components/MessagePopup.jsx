import React from 'react';
import ReactMarkdown from 'react-markdown';
import ReactDOM from 'react-dom';
import { FaEnvelope, FaFilePdf } from 'react-icons/fa';
import styles from '@/styles/MessagePopup.module.css';
import { generatePdfFromMarkdown } from '@/utils/pdfUtils';

const MessagePopup = ({ title, content, timestamp, onClose, threadId, onLoadThread }) => {
  const handleDownloadPDF = (content) => {
    generatePdfFromMarkdown(content);
  };

  console.log("Popup content:", content);
  console.log("Popup timestamp:", timestamp);

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
          <ReactMarkdown>{content}</ReactMarkdown>
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
