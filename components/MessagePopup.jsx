import React from 'react';
import ReactMarkdown from 'react-markdown';
import ReactDOM from 'react-dom';
import { FaEnvelope, FaFilePdf } from 'react-icons/fa';
import styles from '@/styles/MessagePopup.module.css';
import { generatePdfFromMarkdown } from '@/utils/pdfUtils';

const MessagePopup = ({ message, onClose }) => {
  const handleDownloadMessagePDF = (messageContent) => {
    console.log("Message Content:", messageContent);
    generatePdfFromMarkdown(messageContent);
  };

  return ReactDOM.createPortal(
    <div className={styles.messagePopupOverlay}>
      <div className={styles.messagePopup}>
        <div className={styles.messagePopupHeader}>
          {/* Left-aligned buttons */}
          <div className={styles.leftButtons}>
            <button
              className={styles.emailButton}
              onClick={() => {
                const subject = encodeURIComponent('Message Content');
                const body = encodeURIComponent(message.content);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
            >
              <FaEnvelope />
            </button>
            <button
              className={styles.pdfButton}
              onClick={() => handleDownloadMessagePDF(message.content)}
            >
              <FaFilePdf />
            </button>
          </div>
              
          {/* Right-aligned close button */}
          <button
            className={styles.closeButton}
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className={styles.messageContent}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MessagePopup;
