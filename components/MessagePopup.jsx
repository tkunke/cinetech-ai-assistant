import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactDOM from 'react-dom';
import { FaEnvelope, FaFilePdf, FaFileImage } from 'react-icons/fa';
import { useLibrary } from '@/context/LibraryContext';
import { useSession } from 'next-auth/react';
import styles from '@/styles/MessagePopup.module.css';
import { generatePdfFromMarkdown } from '@/utils/pdfUtils';
import { AiOutlineDownload } from 'react-icons/ai';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MessagePopup = ({
  title,
  content,
  timestamp,
  onClose,
  threadId,
  onLoadThread,
  messageUrl = null,    // Default to null when not passed
  isImagePopup = false, // Default to false when not passed
  imageUrl = null,      // Default to null when not passed
  contentId = null,     // Default to null when not passed
  workspaceId = null,   // Default to null when not passed
  type = 'message',     // Default to 'message'
}) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { removeImage, removeMessage } = useLibrary();
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  
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

  const checkTagsBeforeDelete = async () => {
    try {
      // Check if the content is tagged (message or image)
      const checkTagsResponse = await fetch('/api/checkTagsInJoinTables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(type === 'image' ? { imageId: contentId } : { messageId: contentId }),
        }),
      });

      const checkTagsResult = await checkTagsResponse.json();
      console.log('Check tags result:', checkTagsResult);

      if (checkTagsResult[`${type}Tags`]) {
        setShowConfirmationPopup(true); // Show confirmation if there are tags
      } else {
        proceedWithDelete(); // No tags, proceed with delete
      }
    } catch (error) {
      console.error('Error checking tags:', error);
    }
  };

  const proceedWithDelete = async () => {
    try {
      // Remove tags associated with the content
      const removeTagsResponse = await fetch('/api/removeTagsFromJoinTables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(type === 'image' ? { imageId: contentId } : { messageId: contentId }),
        }),
      });

      if (!removeTagsResponse.ok) {
        const errorResult = await removeTagsResponse.json();
        console.error('Failed to remove tag associations:', errorResult.error);
        return;
      }

      console.log('Tags removed successfully');

      // Delete from the database
      const dbResponse = await fetch('/api/saveToPg', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, workspaceId, contentUrl: isImagePopup ? imageUrl : messageUrl, type }),
      });

      if (dbResponse.ok) {
        if (isImagePopup) {
          removeImage(imageUrl);
        } else {
          removeMessage(contentId);
        }
        console.log(`${type === 'image' ? 'Image' : 'Message'} deleted successfully`);
      } else {
        const result = await dbResponse.json();
        console.error('Failed to delete metadata:', result.error);
      }

      onClose();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const handleDelete = () => {
    checkTagsBeforeDelete();
  };

  useEffect(() => {
    console.log('UserId:', userId);
    console.log('WorkspaceId:', workspaceId);
  }, [userId, workspaceId]);

  return ReactDOM.createPortal(
    <div className={isImagePopup ? styles.imagePopupOverlay : styles.messagePopupOverlay}>
      <div className={isImagePopup ? styles.imagePopup : styles.messagePopup}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
        <div className={styles.messagePopupHeader}>
          {!isImagePopup && (
            <div className={styles.timestamp}>{timestamp}</div>
          )}
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
            {isImagePopup ? (
              <button className={styles.pdfButton} onClick={() => handleDownloadImage(content)}>
                <FaFileImage />
              </button>
            ) : (
              <button className={styles.pdfButton} onClick={() => handleDownloadPDF(content)}>
                <FaFilePdf />
              </button>
            )}
          </div>
        </div>
        {title && <h3>{title}</h3>}

        {isImagePopup ? (
          <div className={styles.imageMessageContainer}>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer">
              <img src={imageUrl} alt="Popup Image" className={styles.image} />
            </a>
          </div>
        ) : (
          <div className={styles.messageContent}>
            {/* Use ReactMarkdown with custom renderers */}
            <ReactMarkdown components={renderers} remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
        {!threadId && ( // Only render delete button if threadId is not present
          isImagePopup ? (
            <button onClick={() => handleDelete(userId, contentId, imageUrl, workspaceId, type)}>Delete Image</button>
          ) : (
            <button onClick={() => handleDelete(userId, contentId, messageUrl, workspaceId, type)}>Delete Message</button>
          )
        )}
        {/* Conditionally render "Load Thread" button if threadId is provided */}
        {threadId && onLoadThread && (
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
        
        {showConfirmationPopup && (
          <div className={styles.confirmationOverlay}>
            <div className={styles.confirmationPopup}>
              <h3>This content is associated with tags. Are you sure you want to delete it?</h3>
              <button onClick={proceedWithDelete}>Yes, Delete</button>
              <button onClick={() => setShowConfirmationPopup(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MessagePopup;
