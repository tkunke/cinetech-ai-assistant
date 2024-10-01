import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaPlus, FaTrash, FaSave, FaEdit } from 'react-icons/fa';
import styles from '@/styles/ProjectTags.module.css';
import { useWorkspace } from '@/context/WorkspaceContext';
import { useUser } from '@/context/UserContext';
import { useLibrary } from '@/context/LibraryContext';
import MessagePopup from '@/components/MessagePopup';

const ProjectTags = ({ userId }) => {
  const { activeWorkspaceId } = useWorkspace();
  const { fetchedTags, fetchTags, createTag, deleteTag, updateTag, untagContent } = useLibrary(); // Use tag management from LibraryContext
  const [selectedTag, setSelectedTag] = useState(null);
  const [isCreateTagPopupVisible, setIsCreateTagPopupVisible] = useState(false);
  const [isTagDetailsPopupVisible, setIsTagDetailsPopupVisible] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isEditingTagName, setIsEditingTagName] = useState(false);
  const [objectsWithTag, setObjectsWithTag] = useState([]);
  const [messagesWithTag, setMessagesWithTag] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const { handleStartUsingApp } = useUser();

  useEffect(() => {
    if (userId && activeWorkspaceId) {
      console.log('Fetching tags for workspace:', activeWorkspaceId);
      fetchTags(userId, activeWorkspaceId); // Fetch tags using centralized state
    }
  }, [userId, activeWorkspaceId, fetchTags]);

  const fetchObjectsByTag = async (tag) => {
    handleStartUsingApp();
    if (!userId || !activeWorkspaceId) return;

    try {
      const response = await fetch(`/api/getObjectsByTag?userId=${userId}&workspaceId=${activeWorkspaceId}&tag=${tag.name}`);
      const data = await response.json();

      if (response.ok) {
        const mappedImages = data.images.map((img) => ({
          id: img.id,
          imageUrl: img.image_url,
          thumbnailUrl: img.thumbnail_url,
          tags: [],
        }));

        const mappedMessages = await Promise.all(
          data.messages.map(async (msg) => {
            const messageContentResponse = await fetch(msg.message_url);
            const messageContentData = await messageContentResponse.json();
            return {
              id: msg.id,
              url: msg.message_url,
              timestamp: msg.timestamp,
              content: messageContentData.content || '',
              tags: [],
            };
          })
        );

        setObjectsWithTag(mappedImages);
        setMessagesWithTag(mappedMessages);
        setSelectedTag(tag);
        setIsTagDetailsPopupVisible(true); // Open the tag details popup
      } else {
        console.error('Failed to fetch objects:', data.error);
      }
    } catch (error) {
      console.error('Error fetching objects by tag:', error);
    }
  };

  const handleCreateTag = async () => {
    handleStartUsingApp();
    if (!userId || !activeWorkspaceId || !newTagName.trim()) return;

    await createTag(userId, activeWorkspaceId, newTagName); // Use the createTag function from context
    setNewTagName('');
    setIsCreateTagPopupVisible(false); // Close the create tag popup
  };

  const handleDeleteTag = async (tagId) => {
    if (!userId || !activeWorkspaceId || !tagId) return;

    await deleteTag(userId, activeWorkspaceId, tagId); // Use the deleteTag function from context
    setSelectedTag(null);
    setIsTagDetailsPopupVisible(false); // Close the tag details popup
  };

  const handleRenameTag = (e, tagId) => {
    const newTagName = e.target.value;
  
    // Call updateTag function to update the tag in the context
    updateTag(userId, activeWorkspaceId, tagId, newTagName);
  };    

  const handleSaveTagName = async (tagId) => {
    const tagToSave = fetchedTags.find(tag => tag.id === tagId);
    
    if (!newTagName.trim() || !tagToSave) return;
  
    await updateTag(userId, activeWorkspaceId, tagId, newTagName); // Call updateTag function
    setIsEditingTagName(null); // Exit edit mode
  };
  
  const handleKeyDown = (e, tagId) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevents default behavior (e.g., submitting a form)
      handleSaveTagName(tagId); // Save the tag when Enter is pressed
    }
  };  

  const handleUntag = async (contentId, contentType) => {
    try {
      console.log('Attempting to untag content:', {
        contentId,
        contentType,
        tagId: selectedTag.id
      });

      // Send the untag request to the server
      const response = await untagContent(contentId, selectedTag.id, contentType);
      
      if (response.ok) {
        console.log('Untagging successful, updating UI');
        
        // After untagging, update the UI by removing the item from the list
        if (contentType === 'image') {
          console.log('Previous images state:', objectsWithTag);
          setObjectsWithTag(prevObjects => {
            const updatedObjects = prevObjects.filter(image => image.id !== contentId);
            console.log('Updated images state:', updatedObjects); // Log updated state
            return updatedObjects;
          });
        } else if (contentType === 'message') {
          console.log('Previous messages state:', messagesWithTag);
          setMessagesWithTag(prevMessages => {
            const updatedMessages = prevMessages.filter(message => message.id !== contentId);
            console.log('Updated messages state:', updatedMessages); // Log updated state
            return updatedMessages;
          });
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to untag content:', errorData);
      }
    } catch (error) {
      console.error('Failed to untag content (exception caught):', error);
    }
  }; 

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div>
      {/* Add Tag Button */}
      <button className={styles.addTagButton} onClick={() => setIsCreateTagPopupVisible(true)}>
        <FaPlus title="Create New Tag" />
      </button>
      <ul className={styles.nestedList}>
        {fetchedTags && fetchedTags.length > 0 ? (
          fetchedTags.map((tag) => (
            <li key={tag.id} className={styles.textLine} onClick={() => fetchObjectsByTag(tag)}>
              {tag.name}
            </li>
          ))
        ) : (
          <li>No tags available</li>
        )}
      </ul>

      {isTagDetailsPopupVisible && selectedTag && ReactDOM.createPortal(
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => [setIsTagDetailsPopupVisible(false), setIsEditingTagName(false)]}>
              &times;
            </button>

            <div className={styles.tagHeader}>
            {fetchedTags.map((tag, index) => (
              <div key={index}>
                {isEditingTagName === tag.id ? (
                  <input
                    type="text"
                    value={newTagName}  // Use newTagName state here
                    onChange={(e) => setNewTagName(e.target.value)}  // Update the new tag name when typing
                    onKeyDown={(e) => handleKeyDown(e, tag.id)}  // Handle Enter key to save
                    onBlur={() => setIsEditingTagName(null)}  // Reset to non-edit mode on blur
                    autoFocus
                  />
                ) : (
                  <span onClick={() => setIsEditingTagName(tag.id)}>
                    {tag.name || 'Click to edit'}
                  </span>
                )}
              </div>
            ))}
            </div>
            
            {/* Messages Section */}
            <div className={styles.messagesSection}>
              <h4>Messages</h4>
              {messagesWithTag.length > 0 ? (
                <ul className={styles.messagesList}>
                  {messagesWithTag.map((message, index) => (
                    <li key={index} className={styles.popupTextLine}>
                      <span onClick={() => setSelectedMessage(message)}>
                        {truncateText(message.content, 90)}
                      </span>
                      {console.log('Message ID:', message.id)}
                      {/* 'X' to untag message */}
                      <button title="Untag item" className={styles.untagButton} onClick={() => handleUntag(message.id, 'message')}></button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Tagged messages will show here</p>
              )}
            </div>
            
            {/* Images Section */}
            <div className={styles.thumbnailGridContainer}>
              <h4 className={styles.thumbnailTitle}>Images</h4>
              <div className={styles.thumbnailGrid}>
                {objectsWithTag.length > 0 ? (
                  objectsWithTag.map((image, index) => (
                    <div key={index} className={styles.thumbnailContainer}>
                      <a href={image.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={image.thumbnailUrl}
                          alt={`Image ${index + 1}`}
                          width="75"
                          height="75"
                          className={styles.thumbnail}
                        />
                      </a>
                      {/* 'X' to untag image */}
                      <button title="Untag item" className={styles.untagButton} onClick={() => handleUntag(image.id, 'image')}></button>
                    </div>
                  ))
                ) : (
                  <p>Tagged images will show here</p>
                )}
              </div>
            </div>
              
            <button className={styles.deleteTag} onClick={() => handleDeleteTag(selectedTag.id)}>Delete Tag</button>
          </div>
        </div>,
        document.body
      )}

      {/* Create Tag Popup */}
      {isCreateTagPopupVisible && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.closeButton} onClick={() => setIsCreateTagPopupVisible(false)}>
              &times;
            </button>
            <h3>Create New Project Tag</h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="Tag Name"
              required
              className={styles.inputField}
            />
            <button type="button" className={styles.submitButton} onClick={handleCreateTag}>
              Create
            </button>
          </div>
        </div>
      )}
      {selectedMessage && (
        <MessagePopup 
          content={selectedMessage.content}
          onClose={() => setSelectedMessage(null)} 
        />
      )}
    </div>
  );
};

export default ProjectTags;
