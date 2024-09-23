import React, { useState, useEffect, useCallback } from 'react';
import { FaAsterisk, FaTrash } from 'react-icons/fa';
import styles from '@/styles/MessagesLibrary.module.css';
import { useLibrary } from '@/context/LibraryContext';
import { useWorkspace } from '@/context/WorkspaceContext';
import MessagePopup from '@/components/MessagePopup';

const MessagesLibrary = ({ userId, onTagIconClick }) => {
  const { fetchedMessages, fetchMessages, fetchTags, fetchedTags } = useLibrary();
  const { activeWorkspaceId, fetchWorkspaceMembers, userRole } = useWorkspace();
  const [isTaggingPopupVisible, setIsTaggingPopupVisible] = useState(false);
  const [taggingMessage, setTaggingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [currentMessageToDelete, setCurrentMessageToDelete] = useState(null);

  const fetchMessageContentForPopup = async (messageUrl) => {
    try {
      const response = await fetch(messageUrl);
      const data = await response.json();
      return data.content; 
    } catch (error) {
      console.error('Error fetching message content for popup:', error);
      return null;
    }
  };

  const handleMessageClick = async (message) => {
    try {
      const fullContent = await fetchMessageContentForPopup(message.url);
      if (fullContent) {
        setSelectedMessage({ ...message, content: fullContent });
      } else {
        console.error('Failed to fetch full content for the message');
      }
    } catch (error) {
      console.error('Error fetching full content:', error);
    }
  };

  useEffect(() => {
    if (activeWorkspaceId && userId) {
      fetchWorkspaceMembers(activeWorkspaceId, userId);
      console.log('User\'s role:', userRole);
    }
  }, [activeWorkspaceId, userId]);

  useEffect(() => {
    if (userId && activeWorkspaceId) {
      fetchTags(userId, activeWorkspaceId);
    }
  }, [userId, activeWorkspaceId, fetchTags]);

  useEffect(() => {
    if (userId && activeWorkspaceId) { 
      fetchMessages(activeWorkspaceId);
    }
  }, [userId, activeWorkspaceId, fetchMessages]);

  const truncateText = (text, maxLength) => {
    if (!text) {
      return ''; 
    }

    if (text.length <= maxLength) {
      return text;
    }

    return text.slice(0, maxLength) + '...';
  };

  const handleTagIconClick = (message) => {
    setTaggingMessage(message);
    if (fetchedTags.length > 0) {
      setIsTaggingPopupVisible(true);
    } else {
      console.error("No tags available to display.");
    }
  };

  const handleTagSelect = async (tag) => {
    if (taggingMessage) {
      const updatedMessage = {
        ...taggingMessage,
        tags: [...(taggingMessage.tags || []), tag],
      };
      setTaggingMessage(null);
      setIsTaggingPopupVisible(false);

      try {
        const response = await fetch('/api/userTags', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId, 
            workspaceId: activeWorkspaceId,
            messageUrl: taggingMessage.url, 
            tag: { id: tag.id }
          }),
        });

        if (response.ok) {
          // Optionally handle tag update
        } else {
          console.error('Error updating tag:', await response.json());
        }
      } catch (error) {
        console.error('Error updating tag:', error);
      }
    }
  };

  const handleDeleteContent = async (userId, messageId, messageUrl, activeWorkspaceId, type) => {
    try {
      const checkTagsResponse = await fetch('/api/checkTagsInJoinTables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      });

      const checkTagsResult = await checkTagsResponse.json();

      if (checkTagsResult.messageTags) {
        setShowConfirmationPopup(true);
        setCurrentMessageToDelete({ userId, messageId, messageUrl, activeWorkspaceId, type });
        return;
      }

      setCurrentMessageToDelete({ userId, messageId, messageUrl, activeWorkspaceId, type });
      await handleConfirmDelete();
    } catch (error) {
      console.error('Error checking tags:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentMessageToDelete) return;

    const { userId, messageId, messageUrl, activeWorkspaceId, type } = currentMessageToDelete;

    try {
      const removeTagsResponse = await fetch('/api/removeTagsFromJoinTables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageId }),
      });

      if (!removeTagsResponse.ok) {
        const errorResult = await removeTagsResponse.json();
        console.error('Failed to remove tag associations:', errorResult.error);
        return;
      }

      const dbResponse = await fetch('/api/saveToPg', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, workspaceId: activeWorkspaceId, contentUrl: messageUrl, type }),
      });

      if (dbResponse.ok) {
        const blobResponse = await fetch(`/api/image-store?url=${encodeURIComponent(messageUrl)}&userId=${encodeURIComponent(userId)}`, {
          method: 'DELETE',
        });

        if (blobResponse.ok) {
          // Optionally handle message removal from state
        } else {
          const errorResult = await blobResponse.json();
          console.error('Failed to delete file from blob storage:', errorResult.error);
        }
      } else {
        const result = await dbResponse.json();
        console.error('Failed to delete metadata:', result.error);
      }
    } catch (error) {
      console.error('Error deleting content:', error);
    }

    setShowConfirmationPopup(false);
    setCurrentMessageToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmationPopup(false);
    setCurrentMessageToDelete(null);
  };

  const groupMessagesByMonth = (messages) => {
    return messages.reduce((groups, message) => {
      const date = new Date(message.timestamp);
      const monthYear = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });

      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(message);

      return groups;
    }, {});
  };

  const groupedMessages = groupMessagesByMonth(fetchedMessages);

  const handleCancelTagging = () => {
    setIsTaggingPopupVisible(false);
  };

  return (
    <>
      <div className={styles.messagesContainer}>
        {Object.entries(groupedMessages).map(([monthYear, messages], index) => (
          <div key={index} className={styles.monthGroup}>
            <div className={styles.monthHeader}>{monthYear}</div>
            <ul className={styles.nestedList}>
              {messages.map((message, messageIndex) => (
                <li key={messageIndex} className={styles.textLine} onClick={() => handleMessageClick(message)}>
                  {truncateText(message.preview, 42)}
                  {userRole !== 'viewer' && (
                    <>
                      <FaAsterisk
                        className={styles.tagIcon}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagIconClick(message);
                        }}
                      />
                      <FaTrash
                        className={styles.messageDelete}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContent(userId, message.id, message.url, activeWorkspaceId, 'message');
                        }}
                        title="Delete Message"
                      />
                    </>
                  )}
                  {message.tags &&
                    message.tags.map((tag) => (
                      <span key={tag.id} className={styles.messageTag}>
                        {tag.name}
                      </span>
                    ))}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {isTaggingPopupVisible && taggingMessage && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h3>Select a Tag</h3>
            <ul>
              {fetchedTags.map((tag) => (
                <li key={tag.id}>
                  <button onClick={() => handleTagSelect(tag)}>{tag.name}</button>
                </li>
              ))}
            </ul>
            <button className={styles.cancelButton} onClick={handleCancelTagging}>Cancel</button>
          </div>
        </div>
      )}

      {selectedMessage && (
        <MessagePopup
          title={selectedMessage.title}
          content={selectedMessage.content}
          timestamp={selectedMessage.timestamp}
          onClose={() => setSelectedMessage(null)}
        />
      )}
      {showConfirmationPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <h3 className={styles.popupTitle}>Confirm Deletion</h3>
            <p className={styles.popupMessage}>This message is associated with one or more tags. Are you sure you want to delete it?</p>
            <div className={styles.popupButtons}>
              <button className={styles.confirmButton} onClick={handleConfirmDelete}>
                Yes, Delete
              </button>
              <button className={styles.cancelButton} onClick={handleCancelDelete}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MessagesLibrary;
